import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { cn } from '../utils/cn'
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Inbox, Loader2 } from 'lucide-react'
import OwnButton from './OwnButton'

export interface OwnTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  isLoading?: boolean
  error?: string | null
  emptyTitle?: string
  emptyDescription?: string
  showSearch?: boolean
  searchPlaceholder?: string
  pageSize?: number
  className?: string
  onRowClick?: (row: TData) => void
}

export function OwnTable<TData>({
  data,
  columns,
  isLoading = false,
  error = null,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display matching the criteria.',
  showSearch = false,
  searchPlaceholder = 'Search records...',
  pageSize = 10,
  className,
  onRowClick,
}: OwnTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  return (
    <div className={cn('rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col', className)}>
      {showSearch && (
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-card">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full min-h-9 rounded-xl border border-border bg-muted/50 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {table.getFilteredRowModel().rows.length} total
          </span>
        </div>
      )}

      {/* Main Table Container with smooth horizontal scrolling */}
      <div className="w-full overflow-x-auto relative min-h-[160px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading data...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-danger">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-1">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-foreground">{emptyTitle}</p>
            <p className="text-xs text-muted-foreground max-w-sm">{emptyDescription}</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-foreground border-collapse">
            <thead className="bg-muted/70 text-xs uppercase font-semibold text-muted-foreground border-b border-border tracking-wider select-none sticky top-0 z-10 backdrop-blur-xs">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sortDirection = header.column.getIsSorted()

                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'px-5 py-3.5 text-xs font-semibold whitespace-nowrap',
                          canSort ? 'cursor-pointer hover:text-foreground' : ''
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-muted-foreground">
                              {sortDirection === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-primary" />
                              ) : sortDirection === 'desc' ? (
                                <ChevronDown className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={cn(
                    'transition-colors duration-150 hover:bg-muted/50',
                    onRowClick ? 'cursor-pointer' : ''
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5 text-sm align-middle whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && !error && table.getPageCount() > 1 && (
        <div className="p-3.5 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>
              Page <strong className="text-foreground">{table.getState().pagination.pageIndex + 1}</strong> of{' '}
              <strong className="text-foreground">{table.getPageCount()}</strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} entries
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <OwnButton
              variant="outline"
              size="xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </OwnButton>
            <OwnButton
              variant="outline"
              size="xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </OwnButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnTable
