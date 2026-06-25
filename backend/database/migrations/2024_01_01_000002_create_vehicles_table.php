<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_number')->unique();
            $table->string('registration_number')->unique();
            $table->string('vehicle_type');
            $table->string('vehicle_category');
            $table->string('brand');
            $table->string('model');
            $table->year('manufacturing_year');
            $table->string('chassis_number')->unique();
            $table->string('engine_number')->unique();
            $table->enum('fuel_type', ['petrol', 'diesel', 'electric', 'hybrid', 'cng']);
            $table->integer('seating_capacity')->nullable();
            $table->string('color')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_cost', 12, 2)->nullable();
            $table->enum('current_status', ['available', 'in_use', 'under_maintenance', 'out_of_service', 'sold'])->default('available');
            $table->text('notes')->nullable();
            $table->decimal('current_odometer', 10, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('vehicle_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->enum('document_type', ['registration_certificate', 'insurance', 'revenue_license', 'emission_test', 'lease_document', 'other']);
            $table->string('file_path');
            $table->string('file_name');
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('vehicle_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('caption')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_photos');
        Schema::dropIfExists('vehicle_documents');
        Schema::dropIfExists('vehicles');
    }
};
