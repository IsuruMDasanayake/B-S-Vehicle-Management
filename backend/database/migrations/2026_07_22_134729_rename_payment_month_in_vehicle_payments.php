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
        Schema::table('vehicle_payments', function (Blueprint $table) {
            $table->renameColumn('payment_month', 'rental_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_payments', function (Blueprint $table) {
            $table->renameColumn('rental_period', 'payment_month');
        });
    }
};
