<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fuel_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('fuel_type', ['petrol', 'diesel', 'electric', 'hybrid', 'cng']);
            $table->string('fuel_station')->nullable();
            $table->decimal('quantity_liters', 8, 2);
            $table->decimal('cost_per_liter', 8, 2);
            $table->decimal('total_cost', 10, 2);
            $table->decimal('odometer_reading', 10, 2);
            $table->date('date');
            $table->string('receipt_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->date('service_date');
            $table->date('next_service_date')->nullable();
            $table->decimal('odometer_reading', 10, 2)->nullable();
            $table->integer('next_service_km')->nullable();
            $table->string('service_type');
            $table->enum('maintenance_type', ['regular_service','oil_change','tire_replacement','brake_repair','engine_repair','battery_replacement','ac_service','body_repair','electrical','other']);
            $table->string('mechanic_name')->nullable();
            $table->string('workshop')->nullable();
            $table->decimal('cost', 10, 2)->default(0);
            $table->json('parts_replaced')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->timestamps();
        });

        Schema::create('breakdowns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();
            $table->datetime('breakdown_date');
            $table->string('location')->nullable();
            $table->text('description');
            $table->enum('repair_status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->decimal('repair_cost', 10, 2)->nullable();
            $table->text('repair_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('breakdowns');
        Schema::dropIfExists('maintenance_records');
        Schema::dropIfExists('fuel_entries');
    }
};
