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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Mail,
  Printer,
  Shield,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type StickerOrder,
  type StickerOrderStatus,
  useIsAdmin,
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

function matchesFilter(order: StickerOrder, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return "pending" in order.status;
  if (filter === "printed") return "printed" in order.status;
  if (filter === "mailed") return "mailed" in order.status;
  return true;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useStickerOrders();
  const updateStatus = useUpdateOrderStatus();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [updatingId, setUpdatingId] = useState<bigint | null>(null);

  if (!identity) {
    navigate({ to: "/" });
    return null;
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

  const filteredOrders = orders?.filter((o) => matchesFilter(o, filter)) ?? [];

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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              Sticker Orders
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and fulfill physical QR sticker orders.
            </p>
          </div>

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
                You don't have admin privileges to view this page.
              </p>
              <Button
                className="mt-6 bg-teal-DEFAULT hover:bg-teal-dark text-white"
                onClick={() => navigate({ to: "/dashboard" })}
                data-ocid="admin.primary_button"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : ordersError ? (
            <div className="text-center py-20" data-ocid="admin.error_state">
              <p className="text-destructive">Failed to load orders.</p>
            </div>
          ) : (
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-teal-DEFAULT" />
                    Orders
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
                    <TabsList data-ocid="admin.tab">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="pending">Pending</TabsTrigger>
                      <TabsTrigger value="printed">Printed</TabsTrigger>
                      <TabsTrigger value="mailed">Mailed</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-3" data-ocid="admin.loading_state">
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
                              <p className="truncate">{order.mailingAddress}</p>
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
                                      className="text-xs h-7"
                                      disabled={updatingId === order.orderId}
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
