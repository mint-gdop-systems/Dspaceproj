import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";

const renderWithFallback = ({ getValue }) => getValue() || "—";

const renderPrimaryIdentifier = (resource) => {
	const order = ["filenumber", "issn", "other"];
	if (resource.identifierGroups) {
		for (const g of order) {
			if (
				resource.identifierGroups[g] &&
				resource.identifierGroups[g].length > 0
			)
				return resource.identifierGroups[g][0];
		}
	}
	return resource.identifiers?.[0] || resource.isbn || resource.issn || "—";
};

const sharedColumnsStart = [
	{
		accessorKey: "parentCommunity",
		header: "Sub City",
		cell: renderWithFallback,
	},
	{
		accessorKey: "owningCollection",
		header: "Woreda",
		cell: renderWithFallback,
	},
];

const sharedIdentifierColumn = {
	id: "identifiers",
	header: "Identifier",
	cell: ({ row }) => {
		const resource = row.original;
		const primary = renderPrimaryIdentifier(resource);

		if (
			!resource.identifierGroups ||
			Object.keys(resource.identifierGroups).length === 0
		) {
			return <span className="truncate max-w-48 block text-sm">{primary}</span>;
		}

		const labels = {
			issn: "ISSN",
			filenumber: "File Number",
			other: "Other",
		};
		const ordered = ["filenumber", "issn", "other"];

		return (
			<HoverCard>
				<HoverCardTrigger asChild>
					<span className="truncate max-w-48 block text-sm cursor-pointer underline decoration-dotted">
						{primary}
					</span>
				</HoverCardTrigger>
				<HoverCardContent
					className="w-64 p-3 text-sm shadow-lg rounded-xl border-border/60"
					align="start"
				>
					{ordered.map((g) =>
						resource.identifierGroups?.[g] ? (
							<div key={g} className="mb-2 last:mb-0">
								<div className="font-semibold text-sm text-muted-foreground/80 mb-1">
									{labels[g]}
								</div>
								<div className="space-y-0.5">
									{resource.identifierGroups[g].map((id, idx) => (
										<div
											key={`${g}-${
												// biome-ignore lint/suspicious/noArrayIndexKey: <ignore>
												idx
											}`}
											className="truncate text-foreground font-medium"
										>
											{id}
										</div>
									))}
								</div>
							</div>
						) : null,
					)}
				</HoverCardContent>
			</HoverCard>
		);
	},
};

const sharedActionColumn = {
	id: "actions",
	cell: ({ row, table }) => {
		const resource = row.original;
		const onPreview = table.options.meta?.handlePreview;

		if (resource.source !== "dspace") return null;

		return (
			<div className="w-full flex justify-center items-center">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={(e) => onPreview?.(resource, e)}
				>
					<EyeIcon />
				</Button>
			</div>
		);
	},
};

export const houseColumns = [
	...sharedColumnsStart,
	{
		accessorKey: "houseNumber",
		header: "House #",
		cell: renderWithFallback,
	},
	{
		accessorKey: "houseType",
		header: "House Type",
		cell: renderWithFallback,
	},
	{
		accessorKey: "husband",
		header: "Husband",
		cell: renderWithFallback,
	},
	{
		accessorKey: "wife",
		header: "Wife",
		cell: renderWithFallback,
	},
	{
		accessorKey: "dateOfRegistration",
		header: "Reg. Date",
		cell: renderWithFallback,
	},
	sharedIdentifierColumn,
	sharedActionColumn,
];

export const vitalEventColumns = [
	...sharedColumnsStart,
	{
		accessorKey: "eventType",
		header: "Event Type",
		cell: renderWithFallback,
	},
	{
		accessorKey: "eventSubject",
		header: "Subject Name",
		cell: renderWithFallback,
	},
	{
		accessorKey: "eventDate",
		header: "Event Date",
		cell: renderWithFallback,
	},
	{
		accessorKey: "gender",
		header: "Gender",
		cell: renderWithFallback,
	},
	{
		accessorKey: "motherName",
		header: "Mother Name",
		cell: renderWithFallback,
	},
	{
		accessorKey: "fatherName",
		header: "Father Name",
		cell: renderWithFallback,
	},
	sharedIdentifierColumn,
	sharedActionColumn,
];
