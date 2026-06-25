<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create Roles
        $roles = [
            'super_admin',
            'fleet_manager',
            'driver',
            'mechanic',
            'department_manager'
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        // Create Super Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@bstransport.lk'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password123'),
                'phone' => '0777129147',
                'status' => 'active',
            ]
        );

        $admin->assignRole('super_admin');

        // Create a test Fleet Manager
        $fleetManager = User::firstOrCreate(
            ['email' => 'manager@bstransport.lk'],
            [
                'name' => 'Fleet Manager',
                'password' => Hash::make('password123'),
                'phone' => '0712345678',
                'status' => 'active',
            ]
        );
        $fleetManager->assignRole('fleet_manager');

        // Create a test Driver
        $driverUser = User::firstOrCreate(
            ['email' => 'driver@bstransport.lk'],
            [
                'name' => 'Test Driver',
                'password' => Hash::make('password123'),
                'phone' => '0723456789',
                'status' => 'active',
            ]
        );
        $driverUser->assignRole('driver');
        
        // Seed driver details
        \App\Models\Driver::firstOrCreate(
            ['nic_number' => '901234567V'],
            [
                'user_id' => $driverUser->id,
                'name' => 'Test Driver',
                'address' => 'Colombo, Sri Lanka',
                'contact_number' => '0723456789',
                'license_number' => 'B1234567',
                'license_expiry_date' => now()->addYears(2),
                'status' => 'active',
            ]
        );

        // Seed a sample vehicle
        \App\Models\Vehicle::firstOrCreate(
            ['vehicle_number' => 'WP KB-1234'],
            [
                'registration_number' => 'REG-001',
                'vehicle_type' => 'Car',
                'vehicle_category' => 'Passenger',
                'brand' => 'Toyota',
                'model' => 'Corolla',
                'manufacturing_year' => 2018,
                'chassis_number' => 'CH-123456789',
                'engine_number' => 'EN-987654321',
                'fuel_type' => 'petrol',
                'current_status' => 'available',
            ]
        );
    }
}
