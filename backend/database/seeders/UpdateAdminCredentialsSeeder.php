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
        // Update the old admin or create if not exists
        $admin = User::where('email', 'admin@bstransport.lk')->first();

        if ($admin) {
            $admin->update([
                'email'    => 'circlegroup.lk@gmail.com',
                'name'     => 'CircleGroup Admin',
                'password' => Hash::make('2026@CircleGroup'),
            ]);
            $this->command->info('Admin credentials updated: circlegroup.lk@gmail.com');
        } else {
            // Admin not found by old email — try to find by new email or create
            $admin = User::firstOrCreate(
                ['email' => 'circlegroup.lk@gmail.com'],
                [
                    'name'     => 'CircleGroup Admin',
                    'password' => Hash::make('2026@CircleGroup'),
                    'phone'    => '0777129147',
                    'status'   => 'active',
                ]
            );
            $admin->assignRole('super_admin');
            $this->command->info('Admin user created: circlegroup.lk@gmail.com');
        }
    }
}
