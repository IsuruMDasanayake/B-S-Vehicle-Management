<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\SolarFinanceUserRole;
use Spatie\Permission\Models\Role;

class SolarFinanceUsersSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Spatie role exists
        Role::firstOrCreate(['name' => 'solar_finance_admin']);

        // 2. Finance Admin Account
        $financeAdmin = User::updateOrCreate(
            ['email' => 'finance@circlegroup.lk'],
            [
                'name'     => 'Finance Administrator',
                'password' => Hash::make('Finance@2026'),
                'phone'    => '0771234560',
                'status'   => 'active',
                'role'     => 'solar_finance_admin',
            ]
        );
        $financeAdmin->assignRole('solar_finance_admin');

        SolarFinanceUserRole::updateOrCreate(
            ['user_id' => $financeAdmin->id],
            [
                'finance_role'      => 'finance_admin',
                'max_request_limit' => 1000000.00,
                'approval_tier'     => 3,
                'can_approve'       => true,
                'notes'             => 'Primary Finance Administrator',
            ]
        );

        // 3. Director / MD Account (director@circlegroup.lk)
        $director = User::updateOrCreate(
            ['email' => 'director@circlegroup.lk'],
            [
                'name'     => 'Managing Director',
                'password' => Hash::make('Director@2026'),
                'phone'    => '0771234561',
                'status'   => 'active',
                'role'     => 'solar_admin',
            ]
        );
        $director->assignRole('solar_admin');

        SolarFinanceUserRole::updateOrCreate(
            ['user_id' => $director->id],
            [
                'finance_role'      => 'director',
                'max_request_limit' => 1000000.00,
                'approval_tier'     => 3,
                'can_approve'       => true,
                'notes'             => 'Managing Director & Top Approver',
            ]
        );

        // Also update Eranda Ellepola (existing user 13)
        $eranda = User::where('email', 'eranda@circlegroup.lk')->first();
        if ($eranda) {
            $eranda->update([
                'password' => Hash::make('Director@2026'),
                'status'   => 'active',
            ]);
            SolarFinanceUserRole::updateOrCreate(
                ['user_id' => $eranda->id],
                [
                    'finance_role'      => 'director',
                    'max_request_limit' => 1000000.00,
                    'approval_tier'     => 3,
                    'can_approve'       => true,
                    'notes'             => 'Director / MD',
                ]
            );
        }

        // 4. Project Director Account (project.director@circlegroup.lk)
        $projectDirector = User::updateOrCreate(
            ['email' => 'project.director@circlegroup.lk'],
            [
                'name'     => 'Project Director',
                'password' => Hash::make('ProjDirector@2026'),
                'phone'    => '0771234562',
                'status'   => 'active',
                'role'     => 'solar_employee',
            ]
        );

        SolarFinanceUserRole::updateOrCreate(
            ['user_id' => $projectDirector->id],
            [
                'finance_role'      => 'project_director',
                'max_request_limit' => 250000.00,
                'approval_tier'     => 2,
                'can_approve'       => true,
                'notes'             => 'Project Director & Tier 2 Approver',
            ]
        );

        // Also update Hasintha Rathnayaka (existing user 12)
        $hasintha = User::where('email', 'hasintha@circlegroup.lk')->first();
        if ($hasintha) {
            $hasintha->update([
                'password' => Hash::make('ProjDirector@2026'),
                'status'   => 'active',
            ]);
            SolarFinanceUserRole::updateOrCreate(
                ['user_id' => $hasintha->id],
                [
                    'finance_role'      => 'project_director',
                    'max_request_limit' => 250000.00,
                    'approval_tier'     => 2,
                    'can_approve'       => true,
                    'notes'             => 'Project Director',
                ]
            );
        }

        $this->command->info('Solar Finance Users seeded successfully.');
    }
}
