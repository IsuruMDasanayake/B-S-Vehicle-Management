<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UpdateAdminCredentialsSeeder extends Seeder
{
    /**
     * Update the super admin credentials to CircleGroup credentials.
     * Run with: php artisan db:seed --class=UpdateAdminCredentialsSeeder
     */
    public function run(): void
    {
        // Just ensure the new solar division admin is created
        $admin = User::firstOrCreate(
            ['email' => 'circlegroup.lk@gmail.com'],
            [
                'name'     => 'CircleGroup Admin',
                'password' => Hash::make('2026@CircleGroup'),
                'phone'    => '0777129147',
                'status'   => 'active',
            ]
        );
        
        if (!$admin->hasRole('super_admin')) {
            $admin->assignRole('super_admin');
        }
        
        $this->command->info('Admin user created: circlegroup.lk@gmail.com');
    }
}
