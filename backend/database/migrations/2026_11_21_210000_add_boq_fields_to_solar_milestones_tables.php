<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('section_templates', function (Blueprint $table) {
            $table->string('category')->nullable()->after('name');
            $table->string('unit')->nullable()->after('category');
            $table->decimal('target_qty', 12, 2)->nullable()->after('unit');
        });

        Schema::table('solar_sections', function (Blueprint $table) {
            $table->string('category')->nullable()->after('name');
            $table->string('unit')->nullable()->after('category');
            $table->decimal('target_qty', 12, 2)->nullable()->after('unit');
        });

        Schema::table('solar_upload_batches', function (Blueprint $table) {
            $table->decimal('quantity_done', 12, 2)->nullable()->after('table_number');
        });
    }

    public function down(): void
    {
        Schema::table('solar_upload_batches', function (Blueprint $table) {
            $table->dropColumn('quantity_done');
        });

        Schema::table('solar_sections', function (Blueprint $table) {
            $table->dropColumn(['category', 'unit', 'target_qty']);
        });

        Schema::table('section_templates', function (Blueprint $table) {
            $table->dropColumn(['category', 'unit', 'target_qty']);
        });
    }
};
