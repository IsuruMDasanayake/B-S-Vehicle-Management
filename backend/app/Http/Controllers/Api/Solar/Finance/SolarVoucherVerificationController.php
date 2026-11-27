<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SolarPettyCashTransaction;
use App\Models\SolarCashRequest;

class SolarVoucherVerificationController extends Controller
{
    /**
     * Public verification endpoint for QR code scans.
     * Accessible by mobile phone cameras without logging in.
     */
    public function verify(Request $request, $ref)
    {
        $cleanRef = trim($ref);

        // 1. Try finding in Petty Cash Transactions (PCV)
        $tx = SolarPettyCashTransaction::with([
            'account.custodian:id,name',
            'project:id,name',
            'recorder:id,name',
            'approver:id,name'
        ])->where('voucher_no', $cleanRef)->first();

        if ($tx) {
            $amount = (float) $tx->amount;
            $payee = $tx->paid_to ?? 'Bearer / Site Custodian';
            $dateStr = $tx->created_at ? $tx->created_at->format('d M Y') : date('d M Y');
            $hashSource = "{$tx->voucher_no}:{$amount}:{$dateStr}:{$payee}";
            $hash = strtoupper(substr(hash('sha256', $hashSource), 0, 8));

            return response()->json([
                'found' => true,
                'is_valid' => true,
                'voucher_type' => 'PCV',
                'voucher_title' => 'Official Petty Cash Voucher',
                'voucher_no' => $tx->voucher_no,
                'amount' => $amount,
                'currency' => 'LKR',
                'payee' => $payee,
                'category' => $tx->category,
                'purpose' => $tx->notes ?? 'Site petty cash expenditure',
                'project_name' => $tx->project->name ?? 'CircleGroup Solar HQ / Fleet',
                'project_id' => $tx->solar_project_id,
                'account_name' => $tx->account->account_name ?? 'Petty Cash Float',
                'custodian_name' => $tx->recorder->name ?? ($tx->account->custodian->name ?? 'Field Custodian'),
                'approver_name' => $tx->approver->name ?? 'Finance Department',
                'status' => 'DISBURSED',
                'created_at' => $tx->created_at ? $tx->created_at->toIso8601String() : null,
                'verification_hash' => $hash,
                'has_receipt' => !empty($tx->receipt_url),
                'receipt_url' => $tx->receipt_url,
                'issuer' => 'Circle Engineering (Pvt) Ltd',
                'division' => 'Solar Energy & Renewable Engineering',
                'company_reg' => 'PV-00234190',
            ]);
        }

        // 2. Try finding in Cash Advance Requests (PV)
        $cr = SolarCashRequest::with([
            'requester:id,name',
            'project:id,name',
            'approvals.approver:id,name'
        ])->where('request_no', $cleanRef)->first();

        if ($cr) {
            $amount = (float) ($cr->amount_approved ?? $cr->amount_requested);
            $payee = $cr->requester->name ?? 'Beneficiary';
            $dateStr = $cr->created_at ? $cr->created_at->format('d M Y') : date('d M Y');
            $hashSource = "{$cr->request_no}:{$amount}:{$dateStr}:{$payee}";
            $hash = strtoupper(substr(hash('sha256', $hashSource), 0, 8));

            $approvedApproval = $cr->approvals->where('action', 'approved')->first();
            $approverName = $approvedApproval ? ($approvedApproval->approver->name ?? 'Project Director') : 'Pending Authorization';

            $statusLabel = strtoupper(str_replace('_', ' ', $cr->status));
            $isDisbursed = in_array($cr->status, ['approved', 'disbursed', 'settled']);

            return response()->json([
                'found' => true,
                'is_valid' => $isDisbursed,
                'voucher_type' => 'PV',
                'voucher_title' => 'Official Cash Payment Voucher',
                'voucher_no' => $cr->request_no,
                'amount' => $amount,
                'currency' => 'LKR',
                'payee' => $payee,
                'category' => $cr->category,
                'purpose' => $cr->purpose,
                'project_name' => $cr->project->name ?? 'General Solar Project Site',
                'project_id' => $cr->solar_project_id,
                'account_name' => 'Cash Advance Disbursement',
                'custodian_name' => $cr->requester->name ?? 'Site Supervisor',
                'approver_name' => $approverName,
                'status' => $statusLabel,
                'created_at' => $cr->created_at ? $cr->created_at->toIso8601String() : null,
                'verification_hash' => $hash,
                'has_receipt' => !empty($cr->receipt_proof_url),
                'receipt_url' => $cr->receipt_proof_url,
                'issuer' => 'Circle Engineering (Pvt) Ltd',
                'division' => 'Solar Energy & Renewable Engineering',
                'company_reg' => 'PV-00234190',
            ]);
        }

        // 3. Not Found
        return response()->json([
            'found' => false,
            'is_valid' => false,
            'message' => "No official voucher found matching reference: {$cleanRef}",
            'voucher_no' => $cleanRef,
        ], 404);
    }
}
