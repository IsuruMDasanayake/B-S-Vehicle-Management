<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('trip_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('inspection_type', ['pre_trip', 'post_trip', 'routine']);
            $table->boolean('tires_ok')->default(true);
            $table->boolean('brakes_ok')->default(true);
            $table->boolean('lights_ok')->default(true);
            $table->boolean('mirrors_ok')->default(true);
            $table->boolean('fuel_level_ok')->default(true);
            $table->boolean('engine_ok')->default(true);
            $table->boolean('body_ok')->default(true);
            $table->boolean('ac_ok')->default(true);
            $table->decimal('fuel_level', 5, 2)->nullable();
            $table->decimal('odometer', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->enum('overall_status', ['pass', 'fail', 'conditional'])->default('pass');
            $table->timestamp('inspected_at');
            $table->timestamps();
        });

        Schema::create('insurance_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('insurance_company');
            $table->string('policy_number')->unique();
            $table->string('coverage_type');
            $table->date('start_date');
            $table->date('expiry_date');
            $table->decimal('premium_amount', 10, 2)->nullable();
            $table->string('document_path')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'expired', 'cancelled'])->default('active');
            $table->timestamps();
        });

        Schema::create('revenue_licenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->string('license_number');
            $table->date('issue_date');
            $table->date('expiry_date');
            $table->decimal('fee', 8, 2)->nullable();
            $table->string('document_path')->nullable();
            $table->enum('status', ['active', 'expired'])->default('active');
            $table->timestamps();
        });

        Schema::create('emission_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->date('test_date');
            $table->enum('result', ['pass', 'fail', 'conditional']);
            $table->date('expiry_date');
            $table->string('test_center')->nullable();
            $table->string('certificate_number')->nullable();
            $table->string('document_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emission_tests');
        Schema::dropIfExists('revenue_licenses');
        Schema::dropIfExists('insurance_policies');
        Schema::dropIfExists('inspections');
    }
};
