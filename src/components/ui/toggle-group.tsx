"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/utils";

function ToggleGroup({
	className,
	...props
}: ToggleGroupPrimitive.Props<string>) {
	return (
		<ToggleGroupPrimitive
			data-slot="toggle-group"
			className={cn("flex gap-1", className)}
			{...props}
		/>
	);
}

function ToggleGroupItem({
	className,
	children,
	...props
}: TogglePrimitive.Props<string>) {
	return (
		<TogglePrimitive
			data-slot="toggle-group-item"
			className={cn(
				"inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-input px-4 py-2.5 text-sm font-medium transition-colors",
				"text-muted-foreground hover:border-primary/60 hover:text-foreground",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
				"disabled:pointer-events-none disabled:opacity-50",
				"data-[pressed]:border-primary data-[pressed]:bg-primary/5 data-[pressed]:text-primary",
				className,
			)}
			{...props}
		>
			{children}
		</TogglePrimitive>
	);
}

export { ToggleGroup, ToggleGroupItem };
