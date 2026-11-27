<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\SolarPettyCashTransaction;
use App\Models\SolarCashRequest;
use App\Services\SolarFinanceActivityService;
use Carbon\Carbon;

class SolarFinanceActivityLogSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'circlegroup.lk@gmail.com')->first();
        $director = User::where('email', 'director@circlegroup.lk')->first() ?? User::where('email', 'eranda@circlegroup.lk')->first();
        $projDirector = User::where('email', 'project.director@circlegroup.lk')->first() ?? User::where('email', 'hasintha@circlegroup.lk')->first();
        $financeAdmin = User::where('email', 'finance@circlegroup.lk')->first();

        // 1. Role Assignment Events
        if ($admin) {
            auth()->setUser($admin);
            SolarFinanceActivityService::log(
                'role_updated',
                "Assigned Finance Role 'Director / MD' (Tier 3 Approver, Limit: LKR 1,000,000) to Eranda Ellepola",
                null,
                ['finance_role' => 'director', 'approval_tier' => 3, 'max_limit' => 1000000]
            );
            SolarFinanceActivityService::log(
                'role_updated',
                "Assigned Finance Role 'Project Director' (Tier 2 Approver, Limit: LKR 250,000) to Hasintha Rathnayaka",
                null,
                ['finance_role' => 'project_director', 'approval_tier' => 2, 'max_limit' => 250000]
            );
            SolarFinanceActivityService::log(
                'token_issued',
                "Generated secure mobile cash request token for Kasun Perera (Site Supervisor)",
                null,
                ['target_user' => 'Kasun Perera']
            );
        }

        // 2. Float & Voucher Events
        if ($financeAdmin) {
            auth()->setUser($financeAdmin);
            SolarFinanceActivityService::log(
                'float_created',
                "Allocated Initial Petty Cash Float of LKR 50,000 to Horana Site Account",
                null,
                ['account_name' => 'Horana Site Float', 'initial_float' => 50000]
            );

            $tx = SolarPettyCashTransaction::first();
            if ($tx) {
                SolarFinanceActivityService::log(
                    'voucher_created',
                    "Issued Petty Cash Voucher #{$tx->voucher_no} for LKR " . number_format($tx->amount) . " ({$tx->category})",
                    $tx,
                    ['voucher_no' => $tx->voucher_no, 'amount' => $tx->amount, 'payee' => $tx->paid_to]
                );
                SolarFinanceActivityService::log(
                    'voucher_printed',
                    "Generated Official PDF Print Voucher for #{$tx->voucher_no} with QR verification hash",
                    $tx,
                    ['voucher_no' => $tx->voucher_no]
                );
            }
        }

        // 3. Approval Events
        if ($director) {
            auth()->setUser($director);
            $cr = SolarCashRequest::first();
            if ($cr) {
                SolarFinanceActivityService::log(
                    'cash_request_approved',
                    "Director authorized Cash Advance Request #{$cr->request_no} for LKR " . number_format($cr->amount_requested) . " (Tier 3 Authorization)",
                    $cr,
                    ['request_no' => $cr->request_no, 'amount' => $cr->amount_requested, 'urgency' => $cr->urgency]
                );
            }
        }

        if ($financeAdmin) {
            auth()->setUser($financeAdmin);
            $cr = SolarCashRequest::first();
            if ($cr) {
                SolarFinanceActivityService::log(
                    'cash_disbursed',
                    "Disbursed field advance for Cash Request #{$cr->request_no} via Cash On Site",
                    $cr,
                    ['request_no' => $cr->request_no, 'amount' => $cr->amount_requested]
                );
            }
        }

        $this->command->info('Solar Finance Activity Logs seeded successfully.');
    }
}
