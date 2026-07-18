<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class FixPasswords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:fix-passwords {email?} {password?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $newPassword = $this->argument('password');

        if ($email && $newPassword) {
            $user = \App\Models\User::where('email', $email)->first();
            if ($user) {
                $user->password = \Illuminate\Support\Facades\Hash::make($newPassword);
                $user->save();
                $this->info("Password for {$email} has been reset successfully to the provided password!");
            } else {
                $this->error("User with email {$email} not found!");
            }
            return;
        }

        $users = \App\Models\User::all();
        $fixedCount = 0;
        foreach ($users as $user) {
            if (substr($user->password, 0, 4) !== '$2y$') {
                $this->info("Fixing password for user: {$user->email}");
                $user->password = \Illuminate\Support\Facades\Hash::make($user->password);
                $user->save();
                $fixedCount++;
            }
        }
        $this->info("Fixed {$fixedCount} user passwords.");
    }
}
