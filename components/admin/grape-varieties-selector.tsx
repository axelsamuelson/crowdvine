"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface GrapeVariety {
  id: string;
  name: string;
  description?: string;
}

interface GrapeVarietiesSelectorProps {
  selectedVarieties: string[];
  onVarietiesChange: (varieties: string[]) => void;
  availableVarieties: GrapeVariety[];
  onAddNewVariety?: (name: string) => Promise<void>;
  disabled?: boolean;
}

export default function GrapeVarietiesSelector({
  selectedVarieties,
  onVarietiesChange,
  availableVarieties,
  onAddNewVariety,
  disabled = false,
}: GrapeVarietiesSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleAddVariety = (varietyId: string) => {
    if (!selectedVarieties.includes(varietyId)) {
      onVarietiesChange([...selectedVarieties, varietyId]);
    }
    setSearchValue("");
    setOpen(false);
  };

  const handleRemoveVariety = (varietyId: string) => {
    onVarietiesChange(selectedVarieties.filter((id) => id !== varietyId));
  };

  const handleAddNewVariety = async () => {
    if (!searchValue.trim() || !onAddNewVariety) return;

    setIsAddingNew(true);
    try {
      await onAddNewVariety(searchValue.trim());
      setSearchValue("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to add new grape variety:", error);
    } finally {
      setIsAddingNew(false);
    }
  };

  const filteredVarieties = availableVarieties.filter(
    (variety) =>
      variety.name.toLowerCase().includes(searchValue.toLowerCase()) &&
      !selectedVarieties.includes(variety.id),
  );

  const selectedVarietyObjects = availableVarieties.filter((variety) =>
    selectedVarieties.includes(variety.id),
  );

  return (
    <div className="space-y-3">
      <Label>Grape Varieties</Label>

      {/* Selected varieties display */}
      {selectedVarietyObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVarietyObjects.map((variety) => (
            <Badge
              key={variety.id}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1"
            >
              <span>{variety.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent"
                onClick={() => handleRemoveVariety(variety.id)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {searchValue || "Select grape varieties..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search grape varieties..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {searchValue && onAddNewVariety && (
                  <div className="p-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleAddNewVariety}
                      disabled={isAddingNew}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add "{searchValue}"
                    </Button>
                  </div>
                )}
                {!searchValue && "No grape varieties found."}
              </CommandEmpty>
              <CommandGroup>
                {filteredVarieties.map((variety) => (
                  <CommandItem
                    key={variety.id}
                    value={variety.name}
                    onSelect={() => handleAddVariety(variety.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedVarieties.includes(variety.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {variety.name}
                    {variety.description && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({variety.description})
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
