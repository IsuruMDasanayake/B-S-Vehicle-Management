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
    protected $signature = 'app:fix-passwords';

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
