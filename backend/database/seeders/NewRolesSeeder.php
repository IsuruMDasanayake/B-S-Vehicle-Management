<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class NewRolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $newRoles = [
            'vehicle_admin',
            'solar_admin',
        ];

        foreach ($newRoles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        $this->command->info('New division roles (vehicle_admin, solar_admin) created successfully.');
    }
}
