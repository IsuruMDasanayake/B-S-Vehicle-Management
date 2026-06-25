<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            ['key' => 'map_default_lat', 'value' => '6.9271'], // Colombo
            ['key' => 'map_default_lng', 'value' => '79.8612'],
            ['key' => 'map_default_zoom', 'value' => '13'],
            ['key' => 'map_tile_provider', 'value' => 'osm'], // osm or satellite
            ['key' => 'alert_overspeed_limit', 'value' => '80'], // km/h
            ['key' => 'alert_idle_time_limit', 'value' => '15'], // minutes
            ['key' => 'ui_refresh_rate', 'value' => '10'], // seconds
            ['key' => 'geofence_default_radius', 'value' => '500'], // meters
            ['key' => 'geofence_default_trigger', 'value' => 'both'], // entry, exit, both
        ];

        foreach ($settings as $setting) {
            \App\Models\Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }
    }
}
