import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/languages";

export function LanguagePicker({
  value,
  onChange,
  includeAuto = false,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  includeAuto?: boolean;
  label?: string;
}) {
  const opts = includeAuto ? LANGUAGES : LANGUAGES.filter((l) => l.code !== "auto");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white/5 border-white/10 h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opts.map((l) => (
            <SelectItem
              key={l.code}
              value={l.code}
              subText={l.code !== "auto" ? l.native : undefined}
            >
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
