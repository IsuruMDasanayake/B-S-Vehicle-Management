<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use App\Models\SolarCashRequest;
use App\Models\SolarCashRequestApproval;
use App\Models\SolarFinanceUserRole;
use Illuminate\Http\Request;

class SolarCashRequestController extends Controller
{
    /**
     * List all cash requests with filtering.
     */
    public function index(Request $request)
    {
        $query = SolarCashRequest::with([
            'requester:id,name,email',
            'project:id,name',
            'approvals.approver:id,name'
        ]);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->project_id) {
            $query->where('solar_project_id', $request->project_id);
        }

        if ($request->urgency) {
            $query->where('urgency', $request->urgency);
        }

        $requests = $query->latest()->paginate(25);
        return response()->json($requests);
    }

    /**
     * Show single request details.
     */
    public function show($id)
    {
        $cashRequest = SolarCashRequest::with([
            'requester:id,name,email',
            'project:id,name,client_name',
            'approvals.approver:id,name'
        ])->findOrFail($id);

        return response()->json($cashRequest);
    }

    /**
     * Approve a cash request based on role & threshold.
     */
    public function approve(Request $request, $id)
    {
        $cashRequest = SolarCashRequest::findOrFail($id);
        $user = auth()->user();
        $userFinanceRole = SolarFinanceUserRole::where('user_id', $user->id)->first();
        $roleName = $userFinanceRole?->finance_role ?? 'finance_admin';

        $validated = $request->validate([
            'amount_approved' => 'nullable|numeric|min:0',
            'comments'        => 'nullable|string|max:500',
        ]);

        $approvedAmount = $validated['amount_approved'] ?? $cashRequest->amount_requested;

        // Determine next workflow step
        // If approved by PM and amount > 75000, next is pending_director
        // Otherwise status becomes 'approved' (ready for disbursement by accountant)
        $nextStatus = 'approved';
        if ($cashRequest->status === 'pending_pm' && $approvedAmount > 75000 && !in_array($roleName, ['director', 'project_director', 'finance_admin'])) {
            $nextStatus = 'pending_director';
        }

        $cashRequest->update([
            'amount_approved'       => $approvedAmount,
            'status'                => $nextStatus,
            'current_approver_role' => $nextStatus === 'pending_director' ? 'director' : 'accountant',
        ]);

        SolarCashRequestApproval::create([
            'cash_request_id' => $cashRequest->id,
            'approver_id'     => $user->id,
            'approver_role'   => $roleName,
            'action'          => 'approved',
            'comments'        => $validated['comments'] ?? 'Approved',
        ]);

        \App\Services\SolarFinanceActivityService::log(
            'cash_request_approved',
            "Approved Cash Request #{$cashRequest->request_no} for LKR " . number_format($approvedAmount, 2) . " ({$roleName})",
            $cashRequest,
            ['request_no' => $cashRequest->request_no, 'amount' => $approvedAmount, 'status' => $nextStatus]
        );

        return response()->json([
            'message'      => "Cash Request #{$cashRequest->request_no} approved successfully.",
            'cash_request' => $cashRequest->fresh(['approvals.approver:id,name']),
        ]);
    }

    /**
     * Reject a cash request.
     */
    public function reject(Request $request, $id)
    {
        $cashRequest = SolarCashRequest::findOrFail($id);
        $user = auth()->user();
        $userFinanceRole = SolarFinanceUserRole::where('user_id', $user->id)->first();

        $validated = $request->validate([
            'comments' => 'required|string|min:3',
        ]);

        $cashRequest->update([
            'status' => 'rejected',
        ]);

        SolarCashRequestApproval::create([
            'cash_request_id' => $cashRequest->id,
            'approver_id'     => $user->id,
            'approver_role'   => $userFinanceRole?->finance_role ?? 'admin',
            'action'          => 'rejected',
            'comments'        => $validated['comments'],
        ]);

        \App\Services\SolarFinanceActivityService::log(
            'cash_request_rejected',
            "Rejected Cash Request #{$cashRequest->request_no}: {$validated['comments']}",
            $cashRequest,
            ['request_no' => $cashRequest->request_no]
        );

        return response()->json([
            'message'      => "Cash Request #{$cashRequest->request_no} has been rejected.",
            'cash_request' => $cashRequest,
        ]);
    }

    /**
     * Disburse funds (Accountant / Cashier).
     */
    public function disburse(Request $request, $id)
    {
        $cashRequest = SolarCashRequest::findOrFail($id);

        if (!in_array($cashRequest->status, ['approved'])) {
            return response()->json(['message' => 'Request must be fully approved before disbursement.'], 422);
        }

        $cashRequest->update([
            'status'       => 'disbursed',
            'disbursed_at' => now(),
        ]);

        \App\Services\SolarFinanceActivityService::log(
            'cash_disbursed',
            "Disbursed LKR " . number_format($cashRequest->amount_approved ?? $cashRequest->amount_requested, 2) . " for Request #{$cashRequest->request_no}",
            $cashRequest,
            ['request_no' => $cashRequest->request_no, 'amount' => $cashRequest->amount_approved ?? $cashRequest->amount_requested]
        );

        return response()->json([
            'message'      => "Cash disbursed for Request #{$cashRequest->request_no}.",
            'cash_request' => $cashRequest,
        ]);
    }
}
