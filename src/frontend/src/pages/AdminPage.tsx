import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  CreditCard,
  DollarSign,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type StickerOrder,
  type StickerOrderStatus,
  useAdminSetupToken,
  useAllUsers,
  useIsAdmin,
  useMarkSubscriptionPaid,
  useResetAdminToken,
  useStickerOrders,
  useUpdateOrderStatus,
} from "../hooks/useQueries";

type FilterTab = "all" | "pending" | "printed" | "mailed";

function getStatusLabel(status: StickerOrderStatus): string {
  if ("pending" in status) return "Pending";
  if ("printed" in status) return "Printed";
  if ("mailed" in status) return "Mailed";
  return "Unknown";
}

function getStatusColor(status: StickerOrderStatus): string {
  if ("pending" in status) return "bg-yellow-100 text-yellow-800";
  if ("printed" in status) return "bg-blue-100 text-blue-800";
  if ("mailed" in status) return "bg-teal-DEFAULT/10 text-teal-DEFAULT";
  return "";
}

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSubDate(timestamp: bigint): string {
  if (timestamp === 0n) return "—";
  const ms = Number(timestamp / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function matchesFilter(order: StickerOrder, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return "pending" in order.status;
  if (filter === "printed") return "printed" in order.status;
  if (filter === "mailed") return "mailed" in order.status;
  return true;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useStickerOrders();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const updateStatus = useUpdateOrderStatus();
  const markPaid = useMarkSubscriptionPaid();
  const { data: setupToken, isLoading: tokenLoading } = useAdminSetupToken();
  const resetToken = useResetAdminToken();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [updatingId, setUpdatingId] = useState<bigint | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [extendingUser, setExtendingUser] = useState<string | null>(null);

  if (!identity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-DEFAULT flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">
            Please log in to access the admin panel.
          </p>
          <Button
            className="bg-teal-DEFAULT hover:bg-teal-dark text-white px-8"
            onClick={login}
            disabled={isLoggingIn}
            data-ocid="admin.primary_button"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            {isLoggingIn ? "Logging in..." : "Login to Access Admin"}
          </Button>
        </div>
      </div>
    );
  }

  const handleUpdateStatus = async (
    orderId: bigint,
    status: StickerOrderStatus,
  ) => {
    setUpdatingId(orderId);
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyToken = async () => {
    if (!setupToken) return;
    await navigator.clipboard.writeText(setupToken);
    setCopiedToken(true);
    toast.success("Token copied to clipboard");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleResetToken = async () => {
    try {
      await resetToken.mutateAsync();
      toast.success("Admin token reset successfully");
    } catch {
      toast.error("Failed to reset token");
    }
  };

  const handleExtendSubscription = async (userId: string) => {
    const { Principal } = await import("@icp-sdk/core/principal");
    setExtendingUser(userId);
    try {
      await markPaid.mutateAsync({
        userId: Principal.fromText(userId),
        years: 1,
      });
      toast.success("Subscription extended by 1 year");
    } catch {
      toast.error("Failed to extend subscription");
    } finally {
      setExtendingUser(null);
    }
  };

  const filteredOrders = orders?.filter((o) => matchesFilter(o, filter)) ?? [];

  const now = BigInt(Date.now()) * 1_000_000n;
  const activeSubscriptions =
    allUsers?.filter((u) => u.subscriptionPaidUntil > now).length ?? 0;
  const expiredSubscriptions =
    allUsers?.filter((u) => u.subscriptionPaidUntil <= now).length ?? 0;
  const pendingOrders =
    orders?.filter((o) => "pending" in o.status).length ?? 0;
  const totalUsers = allUsers?.length ?? 0;
  const estimatedRevenue = (activeSubscriptions * 9.99).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="admin.link"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-DEFAULT flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">Admin Panel</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {adminLoading ? (
            <div className="space-y-4" data-ocid="admin.loading_state">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : isAdmin === false ? (
            <div className="text-center py-20" data-ocid="admin.error_state">
              <Shield className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Access Denied
              </h2>
              <p className="text-muted-foreground">
                You don&apos;t have admin privileges to view this page.
              </p>
              <Button
                className="mt-6 bg-teal-DEFAULT hover:bg-teal-dark text-white"
                onClick={() => navigate({ to: "/dashboard" })}
                data-ocid="admin.primary_button"
              >
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                className="mt-3 ml-3 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                onClick={() => navigate({ to: "/claim-admin" })}
                data-ocid="admin.secondary_button"
              >
                Claim Admin Access
              </Button>
            </div>
          ) : ordersError ? (
            <div className="text-center py-20" data-ocid="admin.error_state">
              <p className="text-destructive">Failed to load data.</p>
            </div>
          ) : (
            <Tabs defaultValue="overview">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Admin Panel
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Manage users, payments, and sticker orders.
                  </p>
                </div>
                <TabsList
                  className="bg-gray-200 p-1 rounded-lg"
                  data-ocid="admin.tab"
                >
                  <TabsTrigger
                    value="overview"
                    className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="users"
                    className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                  >
                    Users
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                  >
                    Sticker Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-DEFAULT/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-teal-DEFAULT" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {usersLoading ? "—" : totalUsers}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Total Users
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {usersLoading ? "—" : activeSubscriptions}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Active Subscriptions
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-red-500" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {usersLoading ? "—" : expiredSubscriptions}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Expired / No Sub
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-yellow-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {ordersLoading ? "—" : pendingOrders}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pending Orders
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-card border-teal-DEFAULT/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-DEFAULT" />
                      Revenue Estimate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2">
                      <DollarSign className="w-8 h-8 text-teal-DEFAULT mb-1" />
                      <span className="text-5xl font-bold text-foreground">
                        {usersLoading ? "—" : estimatedRevenue}
                      </span>
                      <span className="text-muted-foreground mb-2">/year</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Based on {activeSubscriptions} active $9.99/year
                      subscriptions
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* USERS TAB */}
              <TabsContent value="users">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-DEFAULT" />
                      User Management
                      {allUsers && (
                        <Badge className="bg-teal-DEFAULT text-white ml-1">
                          {allUsers.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? (
                      <div
                        className="space-y-3"
                        data-ocid="admin.loading_state"
                      >
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-14 rounded-lg" />
                        ))}
                      </div>
                    ) : !allUsers || allUsers.length === 0 ? (
                      <div
                        className="text-center py-14"
                        data-ocid="admin.empty_state"
                      >
                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">
                          No users registered yet
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table data-ocid="admin.table">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Principal ID</TableHead>
                              <TableHead>Vehicles</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Expires</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allUsers.map((user, idx) => {
                              const principalStr = user.userId.toText();
                              const isActive = user.subscriptionPaidUntil > now;
                              const neverPaid =
                                user.subscriptionPaidUntil === 0n;
                              return (
                                <TableRow
                                  key={principalStr}
                                  data-ocid={`admin.row.${idx + 1}`}
                                >
                                  <TableCell className="font-medium">
                                    {user.displayName || "—"}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">
                                    {principalStr.slice(0, 8)}...
                                  </TableCell>
                                  <TableCell>
                                    {String(user.vehicleCount)}
                                  </TableCell>
                                  <TableCell>
                                    {isActive ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                      </span>
                                    ) : neverPaid ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                        None
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        Expired
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {formatSubDate(user.subscriptionPaidUntil)}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                                      disabled={extendingUser === principalStr}
                                      onClick={() =>
                                        handleExtendSubscription(principalStr)
                                      }
                                      data-ocid={`admin.edit_button.${idx + 1}`}
                                    >
                                      {extendingUser === principalStr ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : null}
                                      Extend +1yr
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* STICKER ORDERS TAB */}
              <TabsContent value="orders">
                <Card className="shadow-card">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-teal-DEFAULT" />
                        Sticker Orders
                        {orders && (
                          <Badge className="bg-teal-DEFAULT text-white ml-1">
                            {orders.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <Tabs
                        value={filter}
                        onValueChange={(v) => setFilter(v as FilterTab)}
                      >
                        <TabsList
                          className="bg-gray-200 p-1"
                          data-ocid="admin.tab"
                        >
                          <TabsTrigger
                            value="all"
                            className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                          >
                            All
                          </TabsTrigger>
                          <TabsTrigger
                            value="pending"
                            className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                          >
                            Pending
                          </TabsTrigger>
                          <TabsTrigger
                            value="printed"
                            className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                          >
                            Printed
                          </TabsTrigger>
                          <TabsTrigger
                            value="mailed"
                            className="text-gray-600 data-[state=active]:!bg-teal-DEFAULT data-[state=active]:!text-white"
                          >
                            Mailed
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div
                        className="space-y-3"
                        data-ocid="admin.loading_state"
                      >
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-14 rounded-lg" />
                        ))}
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div
                        className="text-center py-14"
                        data-ocid="admin.empty_state"
                      >
                        <CheckCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">
                          No orders in this category
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table data-ocid="admin.table">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order #</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Vehicle</TableHead>
                              <TableHead>Mailing Address</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOrders.map((order, idx) => (
                              <TableRow
                                key={String(order.orderId)}
                                data-ocid={`admin.row.${idx + 1}`}
                              >
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  #{String(order.orderId)}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {order.displayName}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {order.vehicleDescription}
                                </TableCell>
                                <TableCell className="text-sm max-w-[200px]">
                                  <p className="truncate">
                                    {order.mailingAddress}
                                  </p>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  {formatDate(order.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                                  >
                                    {getStatusLabel(order.status)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {!("printed" in order.status) &&
                                      !("mailed" in order.status) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-7 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                                          disabled={
                                            updatingId === order.orderId
                                          }
                                          onClick={() =>
                                            handleUpdateStatus(order.orderId, {
                                              printed: null,
                                            })
                                          }
                                          data-ocid={`admin.edit_button.${idx + 1}`}
                                        >
                                          {updatingId === order.orderId ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Printer className="w-3 h-3 mr-1" />
                                          )}
                                          Mark Printed
                                        </Button>
                                      )}
                                    {"printed" in order.status && (
                                      <Button
                                        size="sm"
                                        className="text-xs h-7 bg-teal-DEFAULT hover:bg-teal-dark text-white"
                                        disabled={updatingId === order.orderId}
                                        onClick={() =>
                                          handleUpdateStatus(order.orderId, {
                                            mailed: null,
                                          })
                                        }
                                        data-ocid={`admin.primary_button.${idx + 1}`}
                                      >
                                        {updatingId === order.orderId ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Mail className="w-3 h-3 mr-1" />
                                        )}
                                        Mark Mailed
                                      </Button>
                                    )}
                                    {"mailed" in order.status && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3 text-teal-DEFAULT" />
                                        Complete
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SETTINGS TAB */}
              <TabsContent value="settings">
                <Card className="shadow-card border-teal-DEFAULT/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="w-5 h-5 text-teal-DEFAULT" />
                      Admin Token
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Share this token with anyone you want to grant admin
                      access. Reset it after use.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {tokenLoading ? (
                      <Skeleton
                        className="h-10 w-full"
                        data-ocid="admin.loading_state"
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm break-all select-all">
                            {setupToken || "—"}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyToken}
                            disabled={!setupToken}
                            className="shrink-0 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                            data-ocid="admin.secondary_button"
                          >
                            {copiedToken ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetToken}
                          disabled={resetToken.isPending}
                          className="text-xs border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                          data-ocid="admin.edit_button"
                        >
                          {resetToken.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Reset Token
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </main>

      <footer className="border-t border-border mt-16 py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
