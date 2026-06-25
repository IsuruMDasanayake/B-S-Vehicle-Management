<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();
            $table->datetime('accident_date');
            $table->string('location');
            $table->text('description');
            $table->string('police_report_number')->nullable();
            $table->string('police_report_path')->nullable();
            $table->string('insurance_claim_number')->nullable();
            $table->decimal('repair_cost', 10, 2)->nullable();
            $table->json('photos')->nullable();
            $table->enum('status', ['reported', 'under_investigation', 'resolved'])->default('reported');
            $table->timestamps();
        });

        Schema::create('tires', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->string('tire_brand');
            $table->string('tire_size')->nullable();
            $table->enum('position', ['front_left', 'front_right', 'rear_left', 'rear_right', 'spare', 'other']);
            $table->date('installation_date');
            $table->date('replacement_date')->nullable();
            $table->integer('installation_mileage')->nullable();
            $table->integer('replacement_mileage')->nullable();
            $table->enum('status', ['active', 'replaced', 'damaged'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('spare_parts', function (Blueprint $table) {
            $table->id();
            $table->string('part_name');
            $table->string('part_number')->nullable();
            $table->integer('quantity')->default(0);
            $table->integer('min_stock_alert')->default(5);
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('purchase_cost', 10, 2)->nullable();
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('expense_type', ['fuel', 'service', 'insurance', 'license', 'repair', 'parking', 'toll', 'tire', 'spare_parts', 'other']);
            $table->decimal('amount', 10, 2);
            $table->date('date');
            $table->string('description')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('vehicle_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->date('request_date');
            $table->date('return_date')->nullable();
            $table->string('purpose');
            $table->string('destination')->nullable();
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->datetime('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_requests');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('spare_parts');
        Schema::dropIfExists('tires');
        Schema::dropIfExists('accidents');
    }
};
