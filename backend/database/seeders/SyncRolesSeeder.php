<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class SyncRolesSeeder extends Seeder
{
    public function run()
    {
        $users = User::all();
        foreach ($users as $user) {
            $role = $user->roles->first();
            if ($role) {
                $user->role = $role->name;
                $user->save();
            }
        }
        $this->command->info('Roles Synced successfully!');
    }
}
