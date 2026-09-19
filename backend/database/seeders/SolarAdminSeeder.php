<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class SolarAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $admin = User::firstOrCreate(
            ['email' => 'circlegroup.lk@gmail.com'],
            [
                'name'     => 'CircleGroup Admin',
                'password' => Hash::make('2026@CircleGroup'),
                'phone'    => '0761880279',
                'status'   => 'active',
            ]
        );
        $admin->assignRole('super_admin');
        $this->command->info('Solar Admin user created: circlegroup.lk@gmail.com');
    }
}
