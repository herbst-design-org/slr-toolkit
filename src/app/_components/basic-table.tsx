
// src/BasicTable.tsx
import React from 'react'
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	type ColumnDef,
	type Row,
	type CellContext,
	type RowModel,
} from '@tanstack/react-table'
import { TableHead, Table, TableRow, TableBody, TableCell, TableHeader } from './table'
import { Checkbox } from './checkbox'
import LoadingButton from './loading-button'

// TData must have an 'id' if we do getRowId: (row) => row.id
interface BasicTableProps<TData extends { id: string }> {
	data: TData[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	columns: ColumnDef<TData, any>[]
	onAccept?: {
		buttonText: string, action: (selectedItems: RowModel<TData>) => void | Promise<void>,
		isLoading?: boolean
	}
}

function BasicTable<TData extends { id: string }>({
	data,
	columns,
	onAccept
}: BasicTableProps<TData>) {
	const table = useReactTable<TData>({
		data,
		columns,                  // Pass the columns array directly
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id, // TData must have an 'id' field
		enableMultiRowSelection: true,
		initialState: {
			columnVisibility: {
				id: false
			}
		}
	})

	return (
		<>
			<Table dense className="custom-scrollbar h-[500px] overflow-y-scroll">
				<TableHead>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHeader key={header.id} colSpan={header.colSpan}>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</TableHeader>
							))}
						</TableRow>
					))}
				</TableHead>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id} className="max-w-[500px] text-wrap">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
			{onAccept && <LoadingButton loading={onAccept.isLoading ?? false} className="mt-4 w-full" onClick={() => onAccept.action(table.getSelectedRowModel())} > {onAccept.buttonText} </LoadingButton>}
		</>
	)
}

export default BasicTable

// The rest of your utility functions remain mostly the same, 
// but ensure they are also in a .ts or .tsx file so generics work properly.


const getRowRange = <TData,>(
	rows: Array<Row<TData>>,
	clickedRowID: string,
	previousClickedRowID: string,
) => {
	const range: Array<Row<TData>> = [];
	const processedRowsMap = {
		[clickedRowID]: false,
		[previousClickedRowID]: false,
	};
	for (const row of rows) {
		if (row.id === clickedRowID || row.id === previousClickedRowID) {
			if ("" === previousClickedRowID) {
				range.push(row);
				break;
			}

			processedRowsMap[row.id] = true;
		}
		if (
			(processedRowsMap[clickedRowID] ||
				processedRowsMap[previousClickedRowID]) &&
			!row.getIsGrouped()
		) {
			range.push(row);
		}
		if (
			processedRowsMap[clickedRowID] &&
			processedRowsMap[previousClickedRowID]
		) {
			break;
		}
	}

	return range;
};

export const shiftCheckboxClickHandler = <TData,>(
	event: React.MouseEvent<HTMLButtonElement>,
	context: CellContext<TData, unknown>,
	previousClickedRowID: string,
) => {
	if (event.shiftKey) {
		const { rows, rowsById: rowsMap } = context.table.getRowModel();
		const rowsToToggle = getRowRange(
			rows,
			context.row.id,
			rows.map((r) => r.id).includes(previousClickedRowID)
				? previousClickedRowID
				: "",
		);
		const isLastSelected = !rowsMap[context.row.id]?.getIsSelected() || false;
		rowsToToggle.forEach((row) => row.toggleSelected(isLastSelected));
	}
};





export function createSelectColumn<TData>(): ColumnDef<TData> {
	let lastSelectedId = '';

	return {
		id: 'select',
		header: ({ table }) => (
			<Checkbox
				id="select-all"
				checked={table.getIsAllRowsSelected()}
				indeterminate={table.getIsSomeRowsSelected()}
				onChange={() => table.toggleAllRowsSelected()}
			/>
		),
		cell: ({ row, table }) => (
			<Checkbox
				id={`select-row-${row.id}`}
				checked={row.getIsSelected()}
				indeterminate={row.getIsSomeSelected()}
				onChange={row.getToggleSelectedHandler()}
				onClick={(e) => {
					if (e.shiftKey) {
						const { rows, rowsById } = table.getRowModel();
						const rowsToToggle = getRowRange(rows, row.id, lastSelectedId);
						const isLastSelected = rowsById[lastSelectedId]?.getIsSelected();
						rowsToToggle.forEach((row) => row.toggleSelected(isLastSelected));
					}

					lastSelectedId = row.id;
				}}
			/>
		),
		maxSize: 50,
	};
}
