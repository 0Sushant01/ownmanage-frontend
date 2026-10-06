import React, { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import {
  OwnButton,
  OwnCard,
  OwnCardHeader,
  OwnCardTitle,
  OwnCardDescription,
  OwnCardContent,
  OwnKpiCard,
  OwnBadge,
  OwnStatusBadge,
  OwnInput,
  OwnSelect,
  OwnTabs,
  OwnTabsList,
  OwnTabsTrigger,
  OwnTabsContent,
  OwnTable,
  OwnDialog,
  OwnDialogTrigger,
  OwnDialogContent,
  OwnDialogHeader,
  OwnDialogTitle,
  OwnDialogDescription,
  OwnDialogFooter,
  OwnEmptyState,
  OwnErrorState,
  OwnPageHeader,
  OwnFilterBar,
} from '../design-system/components'
import { ThemeToggle } from '../components/ThemeToggle'
import {
  Building2,
  Users,
  Clock,
  DollarSign,
  Search,
  CheckCircle,
  Plus,
  Trash2,
  Download,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'

interface AuditTableRow {
  id: string
  name: string
  role: string
  department: string
  status: string
  salary: string
}

const sampleData: AuditTableRow[] = [
  { id: 'EMP-001', name: 'Rahul Sharma', role: 'Staff Engineer', department: 'Technology', status: 'ACTIVE', salary: '₹1,45,000' },
  { id: 'EMP-002', name: 'Priya Patel', role: 'Product Manager', department: 'Product', status: 'PRESENT', salary: '₹1,60,000' },
  { id: 'EMP-003', name: 'Amit Verma', role: 'Operations Lead', department: 'Operations', status: 'LATE', salary: '₹95,000' },
  { id: 'EMP-004', name: 'Sneha Reddy', role: 'HR Specialist', department: 'People', status: 'ON_LEAVE', salary: '₹85,000' },
  { id: 'EMP-005', name: 'Karan Singh', role: 'Support Executive', department: 'Client Services', status: 'ABSENT', salary: '₹55,000' },
]

const sampleChartData = [
  { name: 'Mon', present: 88, late: 12, absent: 5 },
  { name: 'Tue', present: 94, late: 8, absent: 3 },
  { name: 'Wed', present: 91, late: 10, absent: 4 },
  { name: 'Thu', present: 96, late: 5, absent: 2 },
  { name: 'Fri', present: 89, late: 14, absent: 6 },
]

export const ThemeAudit: React.FC = () => {
  const { theme, resolvedTheme, isDark, setTheme } = useTheme()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState('tech')

  const columns: ColumnDef<AuditTableRow, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info: any) => <span className="font-mono text-xs text-primary font-semibold">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Employee Name',
      cell: (info: any) => <span className="font-bold text-foreground">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'role',
      header: 'Designation',
    },
    {
      accessorKey: 'department',
      header: 'Department',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info: any) => <OwnStatusBadge status={info.getValue() as string} size="sm" />,
    },
    {
      accessorKey: 'salary',
      header: 'Compensation',
      cell: (info: any) => <span className="font-mono font-semibold text-foreground">{info.getValue() as string}</span>,
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-16">
      {/* Page Header */}
      <OwnPageHeader
        title="OWNManage Design System Audit"
        subtitle={`Live cross-theme component testbed. Current Theme: ${theme.toUpperCase()} (Resolved: ${resolvedTheme.toUpperCase()})`}
        badge={
          <OwnBadge variant={isDark ? 'primary' : 'success'} dot>
            {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
          </OwnBadge>
        }
        actions={
          <div className="flex items-center gap-3">
            <ThemeToggle showSystemOption showLabels />
          </div>
        }
      />

      {/* 1. Theme Controller Bar */}
      <OwnCard elevated>
        <OwnCardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Theme Mode Switcher</h4>
            <p className="text-xs text-muted-foreground">
              Verify instantaneous zero-lag mode transitions without page refreshes or color jumps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OwnButton
              variant={theme === 'light' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
            >
              Light
            </OwnButton>
            <OwnButton
              variant={theme === 'dark' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
            >
              Dark
            </OwnButton>
            <OwnButton
              variant={theme === 'system' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTheme('system')}
            >
              System
            </OwnButton>
          </div>
        </OwnCardContent>
      </OwnCard>

      {/* 2. KPI Cards Spectrum */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Semantic KPI Cards (Auto-Adapting)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <OwnKpiCard
            title="Total Staff"
            value="1,248"
            subtitle="Verified accounts"
            icon={<Users className="w-4 h-4" />}
            variant="default"
            trend={{ value: '+8.4%', isPositive: true, label: 'vs last mo' }}
          />
          <OwnKpiCard
            title="Centres"
            value="14"
            subtitle="Operational hubs"
            icon={<Building2 className="w-4 h-4" />}
            variant="primary"
          />
          <OwnKpiCard
            title="Present Today"
            value="982"
            subtitle="Biometric verified"
            icon={<CheckCircle className="w-4 h-4" />}
            variant="success"
            trend={{ value: '94.2%', isPositive: true }}
          />
          <OwnKpiCard
            title="Late Punches"
            value="43"
            subtitle="Past 09:30 AM"
            icon={<Clock className="w-4 h-4" />}
            variant="warning"
          />
          <OwnKpiCard
            title="Absent / Unmarked"
            value="24"
            subtitle="Requires review"
            icon={<Trash2 className="w-4 h-4" />}
            variant="danger"
          />
          <OwnKpiCard
            title="Total Payroll"
            value="₹18.4L"
            subtitle="Monthly disbursal"
            icon={<DollarSign className="w-4 h-4" />}
            variant="info"
          />
        </div>
      </div>

      {/* 3. Button Variants & Sizes */}
      <OwnCard>
        <OwnCardHeader>
          <OwnCardTitle>Buttons & Interactive Controls</OwnCardTitle>
          <OwnCardDescription>
            All variants respect contrast ratios and focus ring tokens across light/dark states.
          </OwnCardDescription>
        </OwnCardHeader>
        <OwnCardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <OwnButton variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Primary Button
            </OwnButton>
            <OwnButton variant="secondary">Secondary Button</OwnButton>
            <OwnButton variant="outline" leftIcon={<Download className="w-3.5 h-3.5" />}>
              Outline Export
            </OwnButton>
            <OwnButton variant="subtle">Subtle Accent</OwnButton>
            <OwnButton variant="ghost">Ghost Button</OwnButton>
            <OwnButton variant="destructive">Destructive</OwnButton>
            <OwnButton variant="primary" isLoading>
              Loading State
            </OwnButton>
            <OwnButton variant="primary" disabled>
              Disabled
            </OwnButton>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <OwnButton size="xs" variant="outline">Size XS</OwnButton>
            <OwnButton size="sm" variant="outline">Size SM</OwnButton>
            <OwnButton size="md" variant="outline">Size MD</OwnButton>
            <OwnButton size="lg" variant="outline">Size LG</OwnButton>
          </div>
        </OwnCardContent>
      </OwnCard>

      {/* 4. Form Controls & Filter Bars */}
      <OwnCard>
        <OwnCardHeader>
          <OwnCardTitle>Form Controls & Filter Inputs</OwnCardTitle>
          <OwnCardDescription>
            Standardized heights, placeholder colors, and focus states.
          </OwnCardDescription>
        </OwnCardHeader>
        <OwnCardContent className="space-y-4">
          <OwnFilterBar>
            <div className="w-full sm:w-64">
              <OwnInput
                placeholder="Search staff, code, or department..."
                leftIcon={<Search className="w-4 h-4" />}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <OwnSelect
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={[
                  { value: 'tech', label: 'Technology Dept' },
                  { value: 'product', label: 'Product Dept' },
                  { value: 'ops', label: 'Operations Dept' },
                  { value: 'all', label: 'All Departments' },
                ]}
              />
            </div>
            <OwnButton variant="secondary" size="md">
              Apply Filter
            </OwnButton>
          </OwnFilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <OwnInput label="Employee Full Name" placeholder="e.g. Anand Kumar" />
            <OwnInput
              label="Work Email"
              type="email"
              placeholder="anand@company.com"
              helperText="Must match enterprise domain"
            />
            <OwnInput
              label="Account ID"
              placeholder="EMP-999"
              error="Badge ID is required and must be unique"
            />
          </div>
        </OwnCardContent>
      </OwnCard>

      {/* 5. Theme-Aware Recharts Graph */}
      <OwnCard>
        <OwnCardHeader>
          <OwnCardTitle>Theme-Aware Analytics & Charts</OwnCardTitle>
          <OwnCardDescription>
            Consumes semantic CSS variables (--color-chart-1, --color-chart-2, --color-chart-4).
          </OwnCardDescription>
        </OwnCardHeader>
        <OwnCardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0d1322' : '#ffffff',
                    borderColor: isDark ? '#1e293b' : '#e2e8f0',
                    borderRadius: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}
                />
                <Bar dataKey="present" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="var(--color-danger)" radius={[6, 6, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </OwnCardContent>
      </OwnCard>

      {/* 6. TanStack Table System */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Enterprise Table System (TanStack Table)
        </h3>
        <OwnTable data={sampleData} columns={columns} showSearch pageSize={5} />
      </div>

      {/* 7. Tabs & Dialog Primitives */}
      <OwnCard>
        <OwnCardHeader>
          <OwnCardTitle>Tabs & Dialog Primitives (Radix UI)</OwnCardTitle>
          <OwnCardDescription>
            Accessible keyboard navigation with semantic modal backdrops.
          </OwnCardDescription>
        </OwnCardHeader>
        <OwnCardContent className="space-y-6">
          <OwnTabs defaultValue="overview">
            <OwnTabsList>
              <OwnTabsTrigger value="overview">Overview</OwnTabsTrigger>
              <OwnTabsTrigger value="attendance">Attendance History</OwnTabsTrigger>
              <OwnTabsTrigger value="salary">Compensation & Tax</OwnTabsTrigger>
              <OwnTabsTrigger value="documents">Credentials</OwnTabsTrigger>
            </OwnTabsList>

            <OwnTabsContent value="overview" className="p-4 rounded-xl border border-border bg-card">
              <p className="text-sm text-foreground">
                Employee overview tab showing verified organizational status, designation, and supervisor alignment.
              </p>
            </OwnTabsContent>
            <OwnTabsContent value="attendance" className="p-4 rounded-xl border border-border bg-card">
              <p className="text-sm text-foreground">
                Full historical shift records, overtime logs, and biometric coordinates.
              </p>
            </OwnTabsContent>
            <OwnTabsContent value="salary" className="p-4 rounded-xl border border-border bg-card">
              <p className="text-sm text-foreground">
                Base salary, performance bonuses, provident fund deductions, and downloadable PDF payslips.
              </p>
            </OwnTabsContent>
            <OwnTabsContent value="documents" className="p-4 rounded-xl border border-border bg-card">
              <p className="text-sm text-foreground">
                Identity documents, appointment letter, and compliance certificates.
              </p>
            </OwnTabsContent>
          </OwnTabs>

          <div className="pt-2">
            <OwnDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <OwnDialogTrigger asChild>
                <OwnButton variant="primary">Launch Radix Modal Dialog</OwnButton>
              </OwnDialogTrigger>
              <OwnDialogContent size="md">
                <OwnDialogHeader>
                  <OwnDialogTitle>Radix Dialog Test</OwnDialogTitle>
                  <OwnDialogDescription>
                    This modal demonstrates proper backdrop blur, elevation tokens, and contrast in {resolvedTheme} mode.
                  </OwnDialogDescription>
                </OwnDialogHeader>
                <div className="p-6 space-y-3">
                  <p className="text-sm text-foreground">
                    Modals now utilize shared design tokens. No hard-coded dark overlays or unreadable texts.
                  </p>
                  <OwnInput label="Confirm Action Password" type="password" placeholder="••••••••" />
                </div>
                <OwnDialogFooter>
                  <OwnButton variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </OwnButton>
                  <OwnButton variant="primary" onClick={() => setDialogOpen(false)}>
                    Confirm Action
                  </OwnButton>
                </OwnDialogFooter>
              </OwnDialogContent>
            </OwnDialog>
          </div>
        </OwnCardContent>
      </OwnCard>

      {/* 8. Skeletons, Empty & Error States */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OwnEmptyState
          title="No Active Disbursals"
          description="There are no pending payroll transactions scheduled for this billing cycle."
          actionLabel="Run Batch Payroll"
          onAction={() => alert('Empty state action triggered')}
        />
        <OwnErrorState
          title="Connection Failure"
          message="Could not reach Supabase PostgreSQL database. Please verify API server heartbeat."
          onRetry={() => alert('Retry handler called')}
        />
      </div>
    </div>
  )
}

export default ThemeAudit
