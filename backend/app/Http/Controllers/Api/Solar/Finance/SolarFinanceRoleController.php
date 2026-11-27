<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use App\Models\SolarFinanceUserRole;
use App\Models\SolarFinanceMobileToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SolarFinanceRoleController extends Controller
{
    /**
     * List all users with their current Finance Role, Approval Limits & Mobile Token.
     */
    public function index(Request $request)
    {
        $users = User::select('id', 'name', 'email', 'role')
            ->orderBy('name')
            ->get();

        $financeRoles = SolarFinanceUserRole::all()->keyBy('user_id');
        $activeTokens = SolarFinanceMobileToken::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get()
            ->groupBy('user_id');

        $result = $users->map(function ($user) use ($financeRoles, $activeTokens) {
            $fRole = $financeRoles->get($user->id);
            $tokenObj = $activeTokens->get($user->id)?->first();

            return [
                'user_id'           => $user->id,
                'name'              => $user->name,
                'email'             => $user->email,
                'global_role'       => $user->role,
                'finance_role'      => $fRole?->finance_role ?? 'site_supervisor',
                'has_finance_role'  => (bool) $fRole,
                'max_request_limit' => $fRole?->max_request_limit ?? 25000.00,
                'approval_tier'     => $fRole?->approval_tier ?? 1,
                'can_approve'       => (bool) ($fRole?->can_approve ?? false),
                'notes'             => $fRole?->notes ?? '',
                'active_token'      => $tokenObj?->token,
                'mobile_link'       => $tokenObj ? url("/solar/finance/request/{$tokenObj->token}") : null,
                'updated_at'        => $fRole?->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'users' => $result,
            'available_roles' => [
                ['key' => 'accountant',        'label' => 'Accountant (Cashier & Reconciler)',      'default_tier' => 2, 'can_approve' => true],
                ['key' => 'site_supervisor',   'label' => 'Site Supervisor (Field Petty Cash)',     'default_tier' => 1, 'can_approve' => false],
                ['key' => 'engineer',          'label' => 'Site Engineer (Technical Procurements)', 'default_tier' => 1, 'can_approve' => false],
                ['key' => 'project_manager',   'label' => 'Project Manager (Tier 1 Approver)',      'default_tier' => 1, 'can_approve' => true],
                ['key' => 'project_director',  'label' => 'Project Director (Tier 2 Approver)',     'default_tier' => 2, 'can_approve' => true],
                ['key' => 'director',          'label' => 'Director / MD (Tier 3 Top Approver)',    'default_tier' => 3, 'can_approve' => true],
                ['key' => 'finance_admin',     'label' => 'Finance Admin (System Config)',          'default_tier' => 3, 'can_approve' => true],
            ],
        ]);
    }

    /**
     * Assign or update a user's finance role and permissions.
     */
    public function updateUserRole(Request $request, $userId)
    {
        $validated = $request->validate([
            'finance_role'      => 'required|string|in:accountant,site_supervisor,project_manager,project_director,director,engineer,finance_admin',
            'max_request_limit' => 'nullable|numeric|min:0',
            'approval_tier'     => 'nullable|integer|between:1,3',
            'can_approve'       => 'nullable|boolean',
            'notes'             => 'nullable|string|max:500',
        ]);

        $role = SolarFinanceUserRole::updateOrCreate(
            ['user_id' => $userId],
            [
                'finance_role'      => $validated['finance_role'],
                'max_request_limit' => $validated['max_request_limit'] ?? 25000.00,
                'approval_tier'     => $validated['approval_tier'] ?? 1,
                'can_approve'       => $validated['can_approve'] ?? false,
                'assigned_by'       => auth()->id(),
                'notes'             => $validated['notes'] ?? null,
            ]
        );

        $targetUser = User::find($userId);
        \App\Services\SolarFinanceActivityService::log(
            'role_updated',
            "Updated Finance Role for {$targetUser?->name} to '{$validated['finance_role']}' (Tier: {$role->approval_tier}, Limit: LKR " . number_format($role->max_request_limit, 2) . ")",
            $role,
            ['target_user_id' => $userId, 'finance_role' => $role->finance_role, 'approval_tier' => $role->approval_tier]
        );

        return response()->json([
            'message' => 'Finance role updated successfully',
            'role'    => $role,
        ]);
    }

    /**
     * Generate a system-generated mobile link / token for an employee.
     */
    public function generateMobileToken(Request $request, $userId)
    {
        $user = User::findOrFail($userId);

        // Deactivate older tokens for this user
        SolarFinanceMobileToken::where('user_id', $userId)->update(['is_active' => false]);

        $tokenStr = Str::random(48);
        $token = SolarFinanceMobileToken::create([
            'user_id'    => $userId,
            'token'      => $tokenStr,
            'expires_at' => now()->addDays(90), // active for 90 days or custom
            'is_active'  => true,
            'created_by' => auth()->id(),
        ]);

        $mobileUrl = url("/solar/finance/request/{$tokenStr}");

        \App\Services\SolarFinanceActivityService::log(
            'token_issued',
            "Generated secure mobile cash request link for {$user->name}",
            $token,
            ['target_user_id' => $user->id, 'target_user' => $user->name]
        );

        return response()->json([
            'message'    => "Mobile token generated for {$user->name}",
            'token'      => $tokenStr,
            'mobile_url' => $mobileUrl,
            'expires_at' => $token->expires_at->toIso8601String(),
        ]);
    }
}
