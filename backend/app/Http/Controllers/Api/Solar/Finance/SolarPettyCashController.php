<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use App\Models\SolarPettyCashAccount;
use App\Models\SolarPettyCashTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SolarPettyCashController extends Controller
{
    /**
     * List all petty cash accounts & floats.
     */
    public function index()
    {
        $accounts = SolarPettyCashAccount::with(['custodian:id,name,email', 'project:id,name'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($accounts);
    }

    /**
     * Create or setup a new petty cash float account.
     */
    public function storeAccount(Request $request)
    {
        $validated = $request->validate([
            'account_name'     => 'required|string|max:100',
            'custodian_id'     => 'required|exists:users,id',
            'solar_project_id' => 'nullable|exists:solar_projects,id',
            'initial_float'    => 'required|numeric|min:0',
            'min_threshold'    => 'nullable|numeric|min:0',
        ]);

        $account = SolarPettyCashAccount::create([
            'account_name'     => $validated['account_name'],
            'custodian_id'     => $validated['custodian_id'],
            'solar_project_id' => $validated['solar_project_id'] ?? null,
            'initial_float'    => $validated['initial_float'],
            'current_balance'  => $validated['initial_float'],
            'min_threshold'    => $validated['min_threshold'] ?? 5000.00,
            'status'           => 'active',
        ]);

        return response()->json([
            'message' => 'Petty cash float created successfully',
            'account' => $account->load(['custodian:id,name', 'project:id,name']),
        ]);
    }

    /**
     * List transactions / PCVs.
     */
    public function transactions(Request $request)
    {
        $query = SolarPettyCashTransaction::with([
            'account:id,account_name',
            'project:id,name',
            'recorder:id,name',
            'approver:id,name'
        ]);

        if ($request->account_id) {
            $query->where('account_id', $request->account_id);
        }

        if ($request->project_id) {
            $query->where('solar_project_id', $request->project_id);
        }

        $transactions = $query->latest()->paginate(25);
        return response()->json($transactions);
    }

    /**
     * Store a new PCV transaction (Expense or Replenishment) & update float balance.
     */
    public function storeTransaction(Request $request)
    {
        $validated = $request->validate([
            'account_id'       => 'required|exists:solar_petty_cash_accounts,id',
            'type'             => 'required|in:expense,replenishment',
            'amount'           => 'required|numeric|min:1',
            'paid_to'          => 'nullable|string|max:150',
            'category'         => 'required|string',
            'solar_project_id' => 'nullable|exists:solar_projects,id',
            'receipt'          => 'nullable|image|max:10240',
            'notes'            => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $account = SolarPettyCashAccount::lockForUpdate()->findOrFail($validated['account_id']);

            if ($validated['type'] === 'expense' && $account->current_balance < $validated['amount']) {
                return response()->json([
                    'message' => 'Insufficient petty cash balance in this account float.'
                ], 422);
            }

            $receiptUrl = null;
            if ($request->hasFile('receipt')) {
                $path = $request->file('receipt')->store('finance/pcv_receipts', 'public');
                $receiptUrl = asset('storage/' . $path);
            }

            $voucherNo = 'PCV-' . date('Ym') . '-' . sprintf('%04d', SolarPettyCashTransaction::count() + 1);

            $transaction = SolarPettyCashTransaction::create([
                'account_id'       => $account->id,
                'voucher_no'       => $voucherNo,
                'type'             => $validated['type'],
                'amount'           => $validated['amount'],
                'paid_to'          => $validated['paid_to'] ?? '',
                'category'         => $validated['category'],
                'solar_project_id' => $validated['solar_project_id'] ?? $account->solar_project_id,
                'receipt_url'      => $receiptUrl,
                'notes'            => $validated['notes'] ?? '',
                'recorded_by'      => auth()->id(),
                'approved_by'      => auth()->id(),
            ]);

            // Update account balance
            if ($validated['type'] === 'expense') {
                $account->current_balance -= $validated['amount'];
            } else {
                $account->current_balance += $validated['amount'];
            }
            $account->save();

            return response()->json([
                'message'     => 'Petty Cash Voucher created successfully',
                'transaction' => $transaction->load(['account', 'recorder:id,name']),
                'new_balance' => $account->current_balance,
            ]);
        });
    }

    /**
     * Get petty cash analytics, trends, category distributions, and custodian performance.
     */
    public function analytics(Request $request)
    {
        $accounts = SolarPettyCashAccount::with(['custodian:id,name', 'project:id,name'])->get();
        $transactions = SolarPettyCashTransaction::with(['account:id,account_name', 'project:id,name'])->get();

        $totalFloatAllocated = $accounts->sum('initial_float');
        $currentFieldBalance = $accounts->sum('current_balance');
        $totalExpensesAllTime = $transactions->where('type', 'expense')->sum('amount');
        $totalReplenishedAllTime = $transactions->where('type', 'replenishment')->sum('amount');

        // This Month
        $monthExpenses = $transactions->where('type', 'expense')
            ->filter(fn($t) => $t->created_at && $t->created_at->isCurrentMonth())
            ->sum('amount');
        $monthReplenished = $transactions->where('type', 'replenishment')
            ->filter(fn($t) => $t->created_at && $t->created_at->isCurrentMonth())
            ->sum('amount');

        // Low balance alerts
        $lowBalanceCount = $accounts->filter(fn($a) => $a->current_balance <= $a->min_threshold)->count();

        // Category breakdown
        $categoryGroups = $transactions->where('type', 'expense')->groupBy('category');
        $categoryBreakdown = [];
        foreach ($categoryGroups as $cat => $txs) {
            $catSum = $txs->sum('amount');
            $categoryBreakdown[] = [
                'name'  => $cat,
                'value' => (float) $catSum,
                'count' => $txs->count(),
            ];
        }
        usort($categoryBreakdown, fn($a, $b) => $b['value'] <=> $a['value']);

        // Account / Custodian Float Performance
        $accountAnalytics = $accounts->map(function ($acc) use ($transactions) {
            $accTxs = $transactions->where('account_id', $acc->id);
            $spent = $accTxs->where('type', 'expense')->sum('amount');
            $replenished = $accTxs->where('type', 'replenishment')->sum('amount');
            $utilization = $acc->initial_float > 0 ? round(($spent / $acc->initial_float) * 100, 1) : 0;

            return [
                'id'                => $acc->id,
                'account_name'      => $acc->account_name,
                'custodian_name'    => $acc->custodian?->name ?? 'Unassigned',
                'project_name'      => $acc->project?->name ?? 'General Custody',
                'initial_float'     => (float) $acc->initial_float,
                'current_balance'   => (float) $acc->current_balance,
                'min_threshold'     => (float) $acc->min_threshold,
                'total_spent'       => (float) $spent,
                'total_replenished' => (float) $replenished,
                'vouchers_count'    => $accTxs->where('type', 'expense')->count(),
                'utilization_pct'   => $utilization,
                'is_low'            => $acc->current_balance <= $acc->min_threshold,
            ];
        });

        // 6-Month Trend (Month by Month)
        $sixMonthsTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $mKey = $date->format('M Y');
            $mExpenses = $transactions->where('type', 'expense')
                ->filter(fn($t) => $t->created_at && $t->created_at->format('Y-m') === $date->format('Y-m'))
                ->sum('amount');
            $mTopups = $transactions->where('type', 'replenishment')
                ->filter(fn($t) => $t->created_at && $t->created_at->format('Y-m') === $date->format('Y-m'))
                ->sum('amount');

            $sixMonthsTrend[] = [
                'month'        => $mKey,
                'expenses'     => (float) $mExpenses,
                'replenished'  => (float) $mTopups,
            ];
        }

        // Project Petty Cash Allocation
        $projectGroups = $transactions->where('type', 'expense')->whereNotNull('solar_project_id')->groupBy('solar_project_id');
        $projectAllocation = [];
        foreach ($projectGroups as $pId => $pTxs) {
            $pName = $pTxs->first()->project?->name ?? "Project #{$pId}";
            $projectAllocation[] = [
                'project_name' => $pName,
                'amount'       => (float) $pTxs->sum('amount'),
                'count'        => $pTxs->count(),
            ];
        }
        usort($projectAllocation, fn($a, $b) => $b['amount'] <=> $a['amount']);

        // Top Payees
        $payeeGroups = $transactions->where('type', 'expense')->whereNotNull('paid_to')->groupBy('paid_to');
        $topPayees = [];
        foreach ($payeeGroups as $payee => $payeeTxs) {
            if (empty(trim($payee))) continue;
            $topPayees[] = [
                'payee'  => $payee,
                'amount' => (float) $payeeTxs->sum('amount'),
                'count'  => $payeeTxs->count(),
            ];
        }
        usort($topPayees, fn($a, $b) => $b['amount'] <=> $a['amount']);
        $topPayees = array_slice($topPayees, 0, 8);

        return response()->json([
            'summary' => [
                'total_float_allocated'   => (float) $totalFloatAllocated,
                'current_field_balance'   => (float) $currentFieldBalance,
                'total_expenses_all_time' => (float) $totalExpensesAllTime,
                'total_replenished_all'   => (float) $totalReplenishedAllTime,
                'month_expenses'          => (float) $monthExpenses,
                'month_replenished'       => (float) $monthReplenished,
                'low_balance_count'       => $lowBalanceCount,
                'active_accounts_count'   => $accounts->count(),
            ],
            'categories'         => $categoryBreakdown,
            'accounts'           => $accountAnalytics,
            'monthly_trend'      => $sixMonthsTrend,
            'project_allocation' => $projectAllocation,
            'top_payees'         => $topPayees,
        ]);
    }
}
