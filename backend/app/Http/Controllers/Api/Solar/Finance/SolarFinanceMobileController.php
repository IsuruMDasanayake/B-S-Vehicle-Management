<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use App\Models\SolarFinanceMobileToken;
use App\Models\SolarFinanceUserRole;
use App\Models\SolarCashRequest;
use App\Models\SolarProject;
use Illuminate\Http\Request;

class SolarFinanceMobileController extends Controller
{
    /**
     * Validate the mobile token and fetch context for the mobile view.
     */
    public function validateToken($token)
    {
        $mobileToken = SolarFinanceMobileToken::with('user')
            ->where('token', $token)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if (!$mobileToken) {
            return response()->json(['message' => 'Invalid or expired mobile access token.'], 403);
        }

        $user = $mobileToken->user;
        $financeRole = SolarFinanceUserRole::where('user_id', $user->id)->first();
        $projects = SolarProject::select('id', 'name', 'client_name')->where('status', 'active')->get();

        $recentRequests = SolarCashRequest::with('project:id,name')
            ->where('requester_id', $user->id)
            ->latest()
            ->take(10)
            ->get();

        return response()->json([
            'valid' => true,
            'user' => [
                'id'           => $user->id,
                'name'         => $user->name,
                'email'        => $user->email,
                'finance_role' => $financeRole?->finance_role ?? 'site_supervisor',
                'max_limit'    => $financeRole?->max_request_limit ?? 25000.00,
            ],
            'projects'        => $projects,
            'recent_requests' => $recentRequests,
        ]);
    }

    /**
     * Submit a cash request via mobile token.
     */
    public function submitRequest(Request $request, $token)
    {
        $mobileToken = SolarFinanceMobileToken::where('token', $token)
            ->where('is_active', true)
            ->firstOrFail();

        $user = $mobileToken->user;
        $financeRole = SolarFinanceUserRole::where('user_id', $user->id)->first();
        $maxLimit = $financeRole?->max_request_limit ?? 50000.00;

        $validated = $request->validate([
            'solar_project_id' => 'nullable|exists:solar_projects,id',
            'amount_requested' => "required|numeric|min:1|max:{$maxLimit}",
            'category'         => 'required|string',
            'purpose'          => 'required|string|min:5',
            'urgency'          => 'required|in:normal,urgent,emergency',
            'receipt_proof'    => 'nullable|image|max:10240', // 10MB max
        ]);

        $proofUrl = null;
        if ($request->hasFile('receipt_proof')) {
            $path = $request->file('receipt_proof')->store('finance/cash_proofs', 'public');
            $proofUrl = asset('storage/' . $path);
        }

        // Determine initial workflow status based on amount
        // Threshold: > 75000 requires Director approval, otherwise PM approval
        $status = $validated['amount_requested'] > 75000 ? 'pending_director' : 'pending_pm';
        $approverRole = $status === 'pending_director' ? 'director' : 'project_manager';

        $reqNumber = 'CR-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $cashRequest = SolarCashRequest::create([
            'request_no'            => $reqNumber,
            'requester_id'          => $user->id,
            'solar_project_id'      => $validated['solar_project_id'] ?? null,
            'amount_requested'      => $validated['amount_requested'],
            'category'              => $validated['category'],
            'purpose'               => $validated['purpose'],
            'urgency'               => $validated['urgency'],
            'receipt_proof_url'     => $proofUrl,
            'status'                => $status,
            'current_approver_role' => $approverRole,
        ]);

        return response()->json([
            'message'      => 'Cash request submitted successfully!',
            'cash_request' => $cashRequest,
        ]);
    }

    /**
     * Submit advance settlement with bill receipts.
     */
    public function submitSettlement(Request $request, $token)
    {
        $mobileToken = SolarFinanceMobileToken::where('token', $token)->where('is_active', true)->firstOrFail();
        $validated = $request->validate([
            'request_id'           => 'required|exists:solar_cash_requests,id',
            'settled_amount'       => 'required|numeric|min:0',
            'returned_cash_amount' => 'required|numeric|min:0',
            'receipt_photo'        => 'nullable|image|max:10240',
        ]);

        $cashRequest = SolarCashRequest::where('id', $validated['request_id'])
            ->where('requester_id', $mobileToken->user_id)
            ->firstOrFail();

        $receiptUrl = $cashRequest->receipt_proof_url;
        if ($request->hasFile('receipt_photo')) {
            $path = $request->file('receipt_photo')->store('finance/settlements', 'public');
            $receiptUrl = asset('storage/' . $path);
        }

        $cashRequest->update([
            'settled_amount'       => $validated['settled_amount'],
            'returned_cash_amount' => $validated['returned_cash_amount'],
            'receipt_proof_url'    => $receiptUrl,
            'status'               => 'settled',
            'settled_at'           => now(),
        ]);

        return response()->json([
            'message' => 'Advance settlement submitted successfully!',
            'request' => $cashRequest,
        ]);
    }

    /**
     * Get request history for this mobile token user.
     */
    public function getRequestHistory($token)
    {
        $mobileToken = SolarFinanceMobileToken::where('token', $token)->firstOrFail();
        $history = SolarCashRequest::with(['project:id,name', 'approvals.approver:id,name'])
            ->where('requester_id', $mobileToken->user_id)
            ->latest()
            ->paginate(15);

        return response()->json($history);
    }
}
