<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('section_templates', function (Blueprint $table) {
            $table->json('checklist_rules')->nullable()->after('sub_sections');
        });

        Schema::table('solar_sections', function (Blueprint $table) {
            $table->json('checklist_rules')->nullable()->after('sub_sections');
        });

        Schema::table('solar_upload_batches', function (Blueprint $table) {
            $table->string('checklist_rule')->nullable()->after('sub_section');
        });

        Schema::table('solar_images', function (Blueprint $table) {
            $table->string('checklist_rule')->nullable()->after('solar_upload_batch_id');
        });
    }

    public function down(): void
    {
        Schema::table('solar_images', function (Blueprint $table) {
            $table->dropColumn('checklist_rule');
        });

        Schema::table('solar_upload_batches', function (Blueprint $table) {
            $table->dropColumn('checklist_rule');
        });

        Schema::table('solar_sections', function (Blueprint $table) {
            $table->dropColumn('checklist_rules');
        });

        Schema::table('section_templates', function (Blueprint $table) {
            $table->dropColumn('checklist_rules');
        });
    }
};
