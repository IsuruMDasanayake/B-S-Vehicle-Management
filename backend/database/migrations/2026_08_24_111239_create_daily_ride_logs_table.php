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
        Schema::create('daily_ride_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('platform'); // PickMe, Uber, HelaGo
            
            // Odometer metrics
            $table->decimal('morning_odo', 10, 2);
            $table->decimal('night_odo', 10, 2);
            $table->decimal('total_km', 8, 2)->virtualAs('night_odo - morning_odo');
            $table->decimal('hire_km', 8, 2);
            $table->decimal('empty_km', 8, 2)->virtualAs('night_odo - morning_odo - hire_km');
            
            // Financials
            $table->decimal('gross_revenue', 10, 2)->default(0);
            $table->decimal('commission', 10, 2)->default(0);
            $table->decimal('net_revenue', 10, 2)->default(0); // This could be calculated or entered
            $table->decimal('wallet_balance', 10, 2)->nullable();
            $table->decimal('extra_earnings', 10, 2)->default(0);
            
            // Fuel
            $table->decimal('fuel_cost', 10, 2)->default(0);
            
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            
            $table->timestamps();
            
            // A driver can only have one log per platform per day
            $table->unique(['driver_id', 'date', 'platform']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_ride_logs');
    }
};
