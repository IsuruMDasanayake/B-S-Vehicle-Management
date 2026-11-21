<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SectionTemplate;
use App\Models\SolarSection;

class SectionTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            // ─────────────────────────────────────────────────────────────
            // 1. PV Installation (Total 384 Tables: 360 Normal Soil + 24 Weathered Rock)
            // ─────────────────────────────────────────────────────────────
            [
                'category'           => 'PV Installation',
                'name'               => 'Ground Cleaning and Adjustment',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 1,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'Site clearing, bush cutting, and ground leveling.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'Pile Testing',
                'unit'               => 'Piles/Tests',
                'target_qty'         => 10,
                'sort_order'         => 2,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'Vertical and lateral pull-out load testing on sample test piles.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'Total Setting-Out',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 3,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'Total station boundary, table rows, and invert coordinates setting-out.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'Pile Marking',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 4,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 12,
                'notes'              => 'Setting out & marking individual pile points per table.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'Drilling',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 5,
                'has_before_after'   => true,
                'has_table_tracking' => true,
                'sub_sections'       => ['Normal Soil (360 Tables)', 'Weathered Rock (24 Tables)'],
                'expected_images'    => 12,
                'notes'              => 'Augering / Rock drilling for pile foundations (Before and After drill hole images).',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'Casting',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 6,
                'has_before_after'   => true,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 12,
                'notes'              => 'G-20 concrete casting with vertical GI poles inserted (Check vertical level).',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'Capping',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 7,
                'has_before_after'   => true,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 12,
                'notes'              => 'Concrete pile top capping and curing protection.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'MMS Super Structure',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 8,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => ['Table-wise', 'Step-wise'],
                'expected_images'    => 10,
                'notes'              => 'Erection of structural steel framework, purlins, and check tilt angles.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'Panel Installation',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 9,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 28,
                'notes'              => 'Mounting 650W PV modules with clamps, star washers, and alignment.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => 'DC Cabling',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 10,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => '1x4mm2 / 1x6mm2 DC string cabling, cable tray & pipe support fixing.',
            ],

            // ─────────────────────────────────────────────────────────────
            // 2. Inverter Installation (Total 32 Inverters: 27 Normal + 5 Rock)
            // ─────────────────────────────────────────────────────────────
            [
                'category'           => 'Inverter Installation',
                'name'               => 'Inverter Structure & Mounting',
                'unit'               => 'Nos',
                'target_qty'         => 32,
                'sort_order'         => 11,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Normal Soil (27 Nos)', 'Weathered Rock (5 Nos)'],
                'expected_images'    => 10,
                'notes'              => 'Inverter foundation civil works and 350kW inverter mechanical mounting.',
            ],
            [
                'category'           => 'Inverter Installation',
                'name'               => 'DC Cable Termination',
                'unit'               => 'Nos',
                'target_qty'         => 32,
                'sort_order'         => 12,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'DC cable string routing and termination into inverter DC inputs.',
            ],
            [
                'category'           => 'Inverter Installation',
                'name'               => 'MC4 Fixing',
                'unit'               => 'Nos',
                'target_qty'         => 32,
                'sort_order'         => 13,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'MC4 connector crimping, labeling, testing, and connection.',
            ],

            // ─────────────────────────────────────────────────────────────
            // 3. Earthing & Lightning Protection
            // ─────────────────────────────────────────────────────────────
            [
                'category'           => 'Earthing & Lightning',
                'name'               => 'Earthing Mesh Marking & Trenching',
                'unit'               => 'Meters',
                'target_qty'         => 20000,
                'sort_order'         => 14,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => '20,000m earthing mesh route setting out and trench excavation.',
            ],
            [
                'category'           => 'Earthing & Lightning',
                'name'               => 'GI Strip Laying & Table Bonding',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 15,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'GI earthing strip laying, module bonding jumpers & connection to table structures.',
            ],
            [
                'category'           => 'Earthing & Lightning',
                'name'               => 'Earth Pit Installation',
                'unit'               => 'Pits',
                'target_qty'         => 32,
                'sort_order'         => 16,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'Earth pit excavation, Cu/GI rods, earth chambers, and resistance testing.',
            ],
            [
                'category'           => 'Earthing & Lightning',
                'name'               => 'Lightning Protection (ESE LPS)',
                'unit'               => 'Points',
                'target_qty'         => 5,
                'sort_order'         => 17,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => '5 ESE lightning protection masts erection, CU down-conductors, and dedicated earth pits.',
            ],

            // ─────────────────────────────────────────────────────────────
            // 4. AC Electrical Works
            // ─────────────────────────────────────────────────────────────
            [
                'category'           => 'AC Electrical Works',
                'name'               => 'LVAC Trenching & Cable Laying',
                'unit'               => 'Meters',
                'target_qty'         => 2000,
                'sort_order'         => 18,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Trench Excavation', 'Cable Laying', 'Quarry Dust & Warning Tape', 'Backfilling'],
                'expected_images'    => 15,
                'notes'              => '2,000m LVAC trenching (600x450mm), quarry dust bedding, cable laying, warning tape & backfill.',
            ],
            [
                'category'           => 'AC Electrical Works',
                'name'               => 'Smart Transformer (MV Station) Civil Works',
                'unit'               => 'Stations',
                'target_qty'         => 2,
                'sort_order'         => 19,
                'has_before_after'   => true,
                'has_table_tracking' => false,
                'sub_sections'       => ['Setting Out & Excavation', 'Rebar Binding & Shuttering', 'G-25 Concrete Casting'],
                'expected_images'    => 12,
                'notes'              => 'Civil foundation construction for 2 MV station kiosks.',
            ],
            [
                'category'           => 'AC Electrical Works',
                'name'               => 'Smart Transformer (MV Station) Equipment Installation',
                'unit'               => 'Stations',
                'target_qty'         => 2,
                'sort_order'         => 20,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Placement & Leveling', 'LV Incomer Terminations', 'MV Bushing & Control Wiring'],
                'expected_images'    => 12,
                'notes'              => 'Positioning, placement, wiring, configuration & testing of 2 MV stations.',
            ],
            [
                'category'           => 'AC Electrical Works',
                'name'               => 'Underground MV Cabling (33kV)',
                'unit'               => 'Meters',
                'target_qty'         => 300,
                'sort_order'         => 21,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => '300m MV cable trench (600x600mm), 3Cx33kV ABC cable laying, warning tape, and backfill.',
            ],
            [
                'category'           => 'AC Electrical Works',
                'name'               => 'Final Termination & Testing',
                'unit'               => 'Stations',
                'target_qty'         => 2,
                'sort_order'         => 22,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'MV cable pothead terminations between MV stations and CEB metering point.',
            ],

            // ─────────────────────────────────────────────────────────────
            // 5. HT Installation & Substation
            // ─────────────────────────────────────────────────────────────
            [
                'category'           => 'HT Installation',
                'name'               => 'Switchyard & Panel Room Civil Works',
                'unit'               => 'Item',
                'target_qty'         => 1,
                'sort_order'         => 23,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Foundation & Excavation', 'Brickwork & Concrete Slab', 'Plastering & Painting', 'Waterproofing'],
                'expected_images'    => 12,
                'notes'              => 'HT meter room and control room civil building construction.',
            ],
            [
                'category'           => 'HT Installation',
                'name'               => 'CEB Gantry Connection & Switchyard Accessories',
                'unit'               => 'Item',
                'target_qty'         => 1,
                'sort_order'         => 24,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Gantry Pole Erection', 'Auto-Recloser & DDLO', 'Switchyard Earthing'],
                'expected_images'    => 10,
                'notes'              => 'Power gantry installation as per CEB standards with LDS, DDLO, and auto-reclosers.',
            ],

            // ─────────────────────────────────────────────────────────────
            // 6. Mobilisation, SCADA & Acceptance
            // ─────────────────────────────────────────────────────────────
            [
                'category'           => 'Mobilisation & Acceptance',
                'name'               => 'Site Mobilisation, Signage & Facilities',
                'unit'               => 'Lump sum',
                'target_qty'         => 1,
                'sort_order'         => 25,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Site Signage & EHS Banners', 'Sanitary & Accommodation', 'Storage Containers & Security'],
                'expected_images'    => 10,
                'notes'              => 'Temporary works, office containers, water/electricity, and EHS safety provisions.',
            ],
            [
                'category'           => 'Mobilisation & Acceptance',
                'name'               => 'Monitoring System (SCADA)',
                'unit'               => 'Item',
                'target_qty'         => 1,
                'sort_order'         => 26,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Fiber Optic Cable Routing', 'SCADA Control Room Equipment', 'Software Config & Integration'],
                'expected_images'    => 10,
                'notes'              => 'SCADA hardware setup, optical fiber network, device integration, and telemetry testing.',
            ],
            [
                'category'           => 'Mobilisation & Acceptance',
                'name'               => 'Testing, Commissioning & PAC',
                'unit'               => 'Lump sum',
                'target_qty'         => 1,
                'sort_order'         => 27,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Pre-Commissioning Cold Tests', 'Hot Commissioning & Inverter Sync', 'CEng Certified Test Reports'],
                'expected_images'    => 10,
                'notes'              => 'CEng certified testing of transformers, inverters, protection relays, earthing, and PAC.',
            ],
            [
                'category'           => 'Mobilisation & Acceptance',
                'name'               => 'As-Built Drawings & Handover',
                'unit'               => 'Lump sum',
                'target_qty'         => 1,
                'sort_order'         => 28,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 8,
                'notes'              => 'Submission of certified PV array layouts, SLDs, cable routing, and warranty documentation.',
            ],
        ];

        // Rename legacy names to official BOQ names
        $legacyNameMap = [
            'Ground Cleaning'                 => 'Ground Cleaning and Adjustment',
            'Orgarin'                         => 'Drilling',
            'MMS Super Structure'             => 'Structure - Installation (Tables)',
            'Panel Installation'              => 'PV Module Installation',
            'DC Cabling'                      => 'DC Cabling & Terminations',
            'AC Cabling'                      => 'LV Cabling',
            'Smart Transformer'               => 'Smart Transformer (MV Station) Equipment Installation',
            'Final Termination'               => 'Final Termination & Testing',
            'LV/MV Panel Board Installation'  => 'Switchyard & Panel Room Civil Works',
            'Underground MV Cabling'          => 'Underground MV Cabling (33kV)',
            'Four Paul Yard'                  => 'CEB Gantry Connection & Switchyard Accessories',
            'Final Investigation'             => 'Testing, Commissioning & PAC',
        ];

        foreach ($legacyNameMap as $oldName => $newName) {
            SolarSection::where('name', $oldName)->update(['name' => $newName]);
            SectionTemplate::where('name', $oldName)->update(['name' => $newName]);
        }

        foreach ($templates as $template) {
            SectionTemplate::updateOrCreate(
                ['name' => $template['name']],
                array_merge($template, [
                    'sub_sections' => $template['sub_sections'] ? json_encode($template['sub_sections']) : null,
                ])
            );
        }

        // Remove any obsolete templates not in the 28 BOQ definitions
        $validNames = array_column($templates, 'name');
        SectionTemplate::whereNotIn('name', $validNames)->delete();

        // Backfill existing SolarSection records with category, unit, target_qty
        $allTemplates = SectionTemplate::all()->keyBy('name');
        foreach (SolarSection::all() as $section) {
            if ($tmpl = $allTemplates->get($section->name)) {
                $section->update([
                    'category'   => $tmpl->category,
                    'unit'       => $tmpl->unit,
                    'target_qty' => $section->target_qty ?: $tmpl->target_qty,
                ]);
            }
        }

        $this->command->info('Section templates seeded successfully: ' . SectionTemplate::count() . ' BOQ milestones ready.');
    }
}
