<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE vehicle_assignments MODIFY COLUMN status ENUM('active', 'completed', 'cancelled', 'pending') NOT NULL DEFAULT 'active'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE vehicle_assignments MODIFY COLUMN status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active'");
    }
};
