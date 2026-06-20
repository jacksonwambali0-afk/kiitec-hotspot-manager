import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { createPackage as createMikrotikPackage, updatePackage as updateMikrotikPackage } from "@/lib/mikrotik-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PackageRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  speed_down_kbps: number | null;
  speed_up_kbps: number | null;
  data_limit_mb: number | null;
  device_limit: number;
  mikrotik_profile: string | null;
  is_active: boolean;
  period_mode?: "rolling" | "calendar_day" | "calendar_week" | "calendar_month" | null;
}

const DURATION_PRESETS = [
  { label: "1 Hour", minutes: 60 },
  { label: "3 Hours", minutes: 180 },
  { label: "12 Hours", minutes: 720 },
  { label: "1 Day", minutes: 1440 },
  { label: "2 Days", minutes: 2880 },
  { label: "1 Week", minutes: 10080 },
  { label: "1 Month", minutes: 43200 },
];

interface FormState {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  speed_down_kbps: string;
  speed_up_kbps: string;
  data_limit_mb: string;
  device_limit: string;
  mikrotik_profile: string;
  is_active: boolean;
  period_mode: string;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "1440",
  speed_down_kbps: "",
  speed_up_kbps: "",
  data_limit_mb: "",
  device_limit: "1",
  mikrotik_profile: "",
  is_active: true,
  period_mode: "rolling",
};

function toForm(pkg: PackageRow): FormState {
  return {
    name: pkg.name,
    description: pkg.description ?? "",
    price: String(pkg.price ?? ""),
    duration_minutes: String(pkg.duration_minutes ?? 1440),
    speed_down_kbps: pkg.speed_down_kbps ? String(pkg.speed_down_kbps) : "",
    speed_up_kbps: pkg.speed_up_kbps ? String(pkg.speed_up_kbps) : "",
    data_limit_mb: pkg.data_limit_mb ? String(pkg.data_limit_mb) : "",
    device_limit: String(pkg.device_limit ?? 1),
    mikrotik_profile: pkg.mikrotik_profile ?? "",
    is_active: pkg.is_active,
    period_mode: pkg.period_mode ?? "rolling",
  };
}

export function PackageDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PackageRow | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (open) setForm(editing ? toForm(editing) : emptyForm);
  }, [open, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const packageName = form.name.trim();
      const suppliedProfile = form.mikrotik_profile.trim();
      const profileName = suppliedProfile || packageName;

      const payload = {
        name: packageName,
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        duration_minutes: Number(form.duration_minutes) || 0,
        speed_down_kbps: form.speed_down_kbps ? Number(form.speed_down_kbps) : null,
        speed_up_kbps: form.speed_up_kbps ? Number(form.speed_up_kbps) : null,
        data_limit_mb: form.data_limit_mb ? Number(form.data_limit_mb) : null,
        device_limit: Number(form.device_limit) || 1,
        mikrotik_profile: profileName,
        period_mode: form.period_mode || "rolling",
        is_active: form.is_active,
      };

      const currentProfileName = editing?.mikrotik_profile?.trim() ?? "";
      const profileParams = {
        name: profileName,
        sessionTime: `${form.duration_minutes}m`,
        rateLimit:
          form.speed_down_kbps || form.speed_up_kbps
            ? `${form.speed_down_kbps || 0}k/${form.speed_up_kbps || 0}k`
            : undefined,
        sharedUsers: Number(form.device_limit) || undefined,
      };

      if (profileName) {
        if (editing && currentProfileName && currentProfileName !== profileName) {
          await updateMikrotikPackage(
            { profileName: currentProfileName },
            { ...profileParams, name: profileName },
          );
        } else if (editing && currentProfileName) {
          await updateMikrotikPackage({ profileName: currentProfileName }, profileParams);
        } else {
          await createMikrotikPackage(profileParams);
        }
      }

      if (editing) {
        const { error } = await supabase.from("packages").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("packages")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success(editing ? "Package updated" : "Package created");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save package"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.duration_minutes || Number(form.duration_minutes) <= 0)
      return toast.error("Set a valid validity duration");
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit package" : "New package"}
          </DialogTitle>
          <DialogDescription>
            Plans map to a MikroTik User Manager profile. Speed and data limits are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="1 Day Unlimited"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes shown to staff"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (TZS)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Validity</Label>
              <Select
                value={
                  DURATION_PRESETS.some((p) => String(p.minutes) === form.duration_minutes)
                    ? form.duration_minutes
                    : "custom"
                }
                onValueChange={(v) => {
                  if (v !== "custom") set("duration_minutes", v);
                }}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((p) => (
                    <SelectItem key={p.minutes} value={String(p.minutes)}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom (minutes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!DURATION_PRESETS.some((p) => String(p.minutes) === form.duration_minutes) && (
            <div className="space-y-2">
              <Label htmlFor="duration-min">Custom validity (minutes)</Label>
              <Input
                id="duration-min"
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="down">Download (Kbps)</Label>
              <Input
                id="down"
                type="number"
                min="0"
                value={form.speed_down_kbps}
                onChange={(e) => set("speed_down_kbps", e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="up">Upload (Kbps)</Label>
              <Input
                id="up"
                type="number"
                min="0"
                value={form.speed_up_kbps}
                onChange={(e) => set("speed_up_kbps", e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data limit (MB)</Label>
              <Input
                id="data"
                type="number"
                min="0"
                value={form.data_limit_mb}
                onChange={(e) => set("data_limit_mb", e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="devices">Device limit</Label>
              <Input
                id="devices"
                type="number"
                min="1"
                value={form.device_limit}
                onChange={(e) => set("device_limit", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile">MikroTik profile name</Label>
            <Input
              id="profile"
              value={form.mikrotik_profile}
              onChange={(e) => set("mikrotik_profile", e.target.value)}
              placeholder="e.g. 1day-profile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_mode">Validity mode</Label>
            <Select value={form.period_mode} onValueChange={(v) => set("period_mode", v)}>
              <SelectTrigger id="period_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rolling">Rolling (starts at first login)</SelectItem>
                <SelectItem value="calendar_day">Calendar day (ends at end of day)</SelectItem>
                <SelectItem value="calendar_week">Calendar week (ends on Sunday)</SelectItem>
                <SelectItem value="calendar_month">Calendar month (ends last day)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="active" className="cursor-pointer">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">Available for new voucher batches</p>
            </div>
            <Switch
              id="active"
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
