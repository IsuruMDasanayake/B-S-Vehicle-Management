<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use App\Models\SolarCashRequest;
use App\Models\SolarPettyCashAccount;
use App\Models\SolarPettyCashTransaction;
use App\Models\SolarProject;
use Illuminate\Http\Request;

class SolarFinanceDashboardController extends Controller
{
    /**
     * Consolidated finance stats, P&L summaries, and quick metric cards.
     */
    public function stats()
    {
        // 1. Petty cash float summary
        $totalFloat = SolarPettyCashAccount::where('status', 'active')->sum('current_balance');
        $lowBalanceFloatsCount = SolarPettyCashAccount::where('status', 'active')
            ->whereRaw('current_balance <= min_threshold')
            ->count();

        // 2. Cash Requests stats
        $pendingApprovals = SolarCashRequest::whereIn('status', ['pending_pm', 'pending_director'])->count();
        $readyForDisbursement = SolarCashRequest::where('status', 'approved')->count();
        $disbursedThisMonth = SolarCashRequest::where('status', 'disbursed')
            ->whereMonth('disbursed_at', now()->month)
            ->whereYear('disbursed_at', now()->year)
            ->sum('amount_approved');

        // 3. Petty Cash expense this month
        $pcvExpenseThisMonth = SolarPettyCashTransaction::where('type', 'expense')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('amount');

        // 4. Project-level financial breakdown (P&L preview)
        $projects = SolarProject::select('id', 'name', 'client_name', 'status')
            ->withCount(['sections'])
            ->get()
            ->map(function ($project) {
                $sitePCV = SolarPettyCashTransaction::where('solar_project_id', $project->id)
                    ->where('type', 'expense')
                    ->sum('amount');

                $siteCashAdvances = SolarCashRequest::where('solar_project_id', $project->id)
                    ->whereIn('status', ['disbursed', 'settled'])
                    ->sum('amount_approved');

                $totalProjectSpend = $sitePCV + $siteCashAdvances;

                return [
                    'id'               => $project->id,
                    'name'             => $project->name,
                    'client'           => $project->client_name,
                    'status'           => $project->status,
                    'petty_cash_spent' => $sitePCV,
                    'cash_advances'    => $siteCashAdvances,
                    'total_cash_spent' => $totalProjectSpend,
                ];
            });

        return response()->json([
            'overview' => [
                'total_petty_cash_in_field' => $totalFloat,
                'low_float_alerts'          => $lowBalanceFloatsCount,
                'pending_approvals_count'   => $pendingApprovals,
                'ready_to_disburse_count'   => $readyForDisbursement,
                'disbursed_this_month'      => $disbursedThisMonth,
                'petty_cash_spent_month'    => $pcvExpenseThisMonth,
            ],
            'projects_financials' => $projects,
        ]);
    }
}
