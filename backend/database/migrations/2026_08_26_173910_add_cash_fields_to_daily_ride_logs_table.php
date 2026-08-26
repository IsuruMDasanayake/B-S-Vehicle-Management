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
        Schema::table('daily_ride_logs', function (Blueprint $table) {
            $table->decimal('other_expenses', 10, 2)->default(0)->after('fuel_cost');
            $table->decimal('cash_on_hand', 10, 2)->default(0)->after('other_expenses');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('daily_ride_logs', function (Blueprint $table) {
            //
        });
    }
};
