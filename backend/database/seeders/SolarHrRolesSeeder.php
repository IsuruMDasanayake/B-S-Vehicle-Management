<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class SolarHrRolesSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'solar_hr_admin',  // Full HR module access
            'solar_employee',  // Self-service only
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        $this->command->info('Solar HR roles created: solar_hr_admin, solar_employee');
    }
}
