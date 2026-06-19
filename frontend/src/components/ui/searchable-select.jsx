import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SearchableSelect({
	value,
	onChange,
	fetchOptions,
	placeholder = "Select...",
	allLabel = "All",
	searchPlaceholder = "Search...",
	disabled = false,
}) {
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState([]);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(false);
	const fetchRef = useRef(fetchOptions);
	const inputRef = useRef(null);

	useEffect(() => {
		fetchRef.current = fetchOptions;
	}, [fetchOptions]);

	useEffect(() => {
		if (!open) {
			setSearch("");
			return;
		}

		let cancelled = false;
		setLoading(true);

		Promise.resolve(fetchRef.current()).then((result) => {
			if (cancelled) return;
			setOptions(result || []);
			setLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [open]);

	useEffect(() => {
		if (open && inputRef.current) {
			inputRef.current.focus();
		}
	}, [open]);

	const filteredOptions = useMemo(() => {
		if (!search) return options;
		const q = search.toLowerCase();
		return options.filter((o) => o.name.toLowerCase().includes(q));
	}, [options, search]);

	const selectedOption = options.find((o) => o.uuid === value);

	const handleSelect = (uuid) => {
		onChange(uuid || null);
		setOpen(false);
	};

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild disabled={disabled}>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal"
					disabled={disabled}
				>
					<span className="truncate">
						{value && selectedOption ? selectedOption.name : placeholder}
					</span>
					<ChevronDownIcon
						className={cn(
							"size-4 shrink-0 text-muted-foreground transition-transform duration-200",
							open && "rotate-180",
						)}
					/>
				</Button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={4}
					className="z-50 w-(--radix-popover-trigger-width) rounded-lg border border-border bg-popover p-1.5 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<div className="relative mb-1.5">
						<SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<input
							ref={inputRef}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={searchPlaceholder}
							className="flex h-8 w-full rounded-md border border-input bg-background py-1 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						/>
					</div>

					<div className="max-h-60 overflow-y-auto">
						{loading ? (
							<div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
								Loading...
							</div>
						) : (
							<>
								<button
									type="button"
									onClick={() => handleSelect(null)}
									className={cn(
										"flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors hover:bg-accent",
										!value && "bg-accent font-medium",
									)}
								>
									<CheckIcon
										className={cn(
											"size-4 shrink-0",
											!value ? "opacity-100" : "opacity-0",
										)}
									/>
									{allLabel}
								</button>
								{filteredOptions.length === 0 ? (
									<div className="px-2.5 py-6 text-sm text-muted-foreground text-center">
										No results found
									</div>
								) : (
									filteredOptions.map((opt) => (
										<button
											key={opt.uuid}
											type="button"
											onClick={() => handleSelect(opt.uuid)}
											className={cn(
												"flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors hover:bg-accent",
												value === opt.uuid && "bg-accent font-medium",
											)}
										>
											<CheckIcon
												className={cn(
													"size-4 shrink-0",
													value === opt.uuid ? "opacity-100" : "opacity-0",
												)}
											/>
											<span className="truncate">{opt.name}</span>
										</button>
									))
								)}
							</>
						)}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
