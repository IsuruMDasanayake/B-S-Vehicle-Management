<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use App\Models\SolarProject;
use App\Models\SolarPettyCashTransaction;
use App\Models\SolarCashRequest;
use Illuminate\Http\Request;

class SolarProjectPnlController extends Controller
{
    /**
     * Get consolidated P&L report for all solar projects.
     */
    public function index(Request $request)
    {
        $projects = SolarProject::with(['site:id,name'])
            ->orderBy('id', 'desc')
            ->get();

        $pcvTransactions = SolarPettyCashTransaction::where('type', 'expense')->get()->groupBy('solar_project_id');
        $cashAdvances = SolarCashRequest::whereIn('status', ['disbursed', 'settled'])->get()->groupBy('solar_project_id');

        $totalContractValue = 0;
        $totalDirectCosts = 0;
        $atRiskCount = 0;

        $projectList = $projects->map(function ($project) use ($pcvTransactions, $cashAdvances, &$totalContractValue, &$totalDirectCosts, &$atRiskCount) {
            $sitePCVs = $pcvTransactions->get($project->id, collect());
            $siteAdvances = $cashAdvances->get($project->id, collect());

            $pcvTotal = $sitePCVs->sum('amount');
            $advancesTotal = $siteAdvances->sum('amount_approved');
            $totalCost = $pcvTotal + $advancesTotal;

            $contractValue = (float) $project->contract_value;
            $budgetLimit = (float) $project->budget_limit;

            $grossProfit = $contractValue - $totalCost;
            $marginPct = $contractValue > 0 ? round(($grossProfit / $contractValue) * 100, 1) : 0;
            $budgetVariance = $budgetLimit > 0 ? $budgetLimit - $totalCost : 0;

            // At risk if budget exceeded or margin drops below 10% on active projects
            $isAtRisk = ($budgetLimit > 0 && $totalCost > $budgetLimit) || ($contractValue > 0 && $marginPct < 10);
            if ($isAtRisk) {
                $atRiskCount++;
            }

            $totalContractValue += $contractValue;
            $totalDirectCosts += $totalCost;

            // Category breakdown for this project
            $categories = [];
            foreach ($sitePCVs as $tx) {
                $categories[$tx->category] = ($categories[$tx->category] ?? 0) + (float) $tx->amount;
            }
            foreach ($siteAdvances as $req) {
                $categories[$req->category] = ($categories[$req->category] ?? 0) + (float) $req->amount_approved;
            }

            return [
                'id'                 => $project->id,
                'name'               => $project->name,
                'client_name'        => $project->client_name,
                'status'             => $project->status,
                'site_name'          => $project->site?->name ?? 'General Site',
                'contract_value'     => $contractValue,
                'budget_limit'       => $budgetLimit,
                'petty_cash_total'   => $pcvTotal,
                'cash_advances_total'=> $advancesTotal,
                'total_direct_costs' => $totalCost,
                'gross_profit'       => $grossProfit,
                'margin_pct'         => $marginPct,
                'budget_variance'    => $budgetVariance,
                'is_at_risk'         => $isAtRisk,
                'category_breakdown' => $categories,
                'vouchers_count'     => $sitePCVs->count(),
                'advances_count'     => $siteAdvances->count(),
            ];
        });

        $totalProfit = $totalContractValue - $totalDirectCosts;
        $overallMargin = $totalContractValue > 0 ? round(($totalProfit / $totalContractValue) * 100, 1) : 0;

        return response()->json([
            'summary' => [
                'total_contract_value' => $totalContractValue,
                'total_direct_costs'   => $totalDirectCosts,
                'total_gross_profit'   => $totalProfit,
                'overall_margin_pct'   => $overallMargin,
                'total_projects_count' => $projects->count(),
                'at_risk_count'        => $atRiskCount,
            ],
            'projects' => $projectList,
        ]);
    }

    /**
     * Get granular P&L breakdown and transaction logs for a single solar project.
     */
    public function show($id)
    {
        $project = SolarProject::with(['site'])->findOrFail($id);

        $vouchers = SolarPettyCashTransaction::with(['recorder:id,name', 'account:id,account_name'])
            ->where('solar_project_id', $id)
            ->latest()
            ->get();

        $advances = SolarCashRequest::with(['requester:id,name', 'approvals.approver:id,name'])
            ->where('solar_project_id', $id)
            ->latest()
            ->get();

        $pcvTotal = $vouchers->where('type', 'expense')->sum('amount');
        $advancesTotal = $advances->whereIn('status', ['disbursed', 'settled'])->sum('amount_approved');
        $totalCost = $pcvTotal + $advancesTotal;
        $contractValue = (float) $project->contract_value;
        $grossProfit = $contractValue - $totalCost;
        $marginPct = $contractValue > 0 ? round(($grossProfit / $contractValue) * 100, 1) : 0;

        return response()->json([
            'project'          => $project,
            'contract_value'   => $contractValue,
            'budget_limit'     => (float) $project->budget_limit,
            'petty_cash_total' => $pcvTotal,
            'advances_total'   => $advancesTotal,
            'total_cost'       => $totalCost,
            'gross_profit'     => $grossProfit,
            'margin_pct'       => $marginPct,
            'vouchers'         => $vouchers,
            'advances'         => $advances,
        ]);
    }

    /**
     * Update project contract value and budget limit.
     */
    public function updateBudget(Request $request, $id)
    {
        $project = SolarProject::findOrFail($id);

        $validated = $request->validate([
            'contract_value' => 'required|numeric|min:0',
            'budget_limit'   => 'nullable|numeric|min:0',
        ]);

        $project->update([
            'contract_value' => $validated['contract_value'],
            'budget_limit'   => $validated['budget_limit'] ?? 0,
        ]);

        return response()->json([
            'message' => "Contract value updated for {$project->name}",
            'project' => $project,
        ]);
    }
}
