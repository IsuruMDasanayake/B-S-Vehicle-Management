<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE vehicles MODIFY COLUMN current_status ENUM('available', 'assigned', 'under_maintenance', 'out_of_service', 'sold') NOT NULL DEFAULT 'available'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE vehicles MODIFY COLUMN current_status ENUM('available', 'in_use', 'under_maintenance', 'out_of_service', 'sold') NOT NULL DEFAULT 'available'");
    }
};
