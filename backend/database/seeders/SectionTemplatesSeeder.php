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
            // 1. PV Installation (7 Standard Sub-categories)
            // ─────────────────────────────────────────────────────────────
            [
                'category'           => 'PV Installation',
                'name'               => '01 Table Leg Marking',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 1,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'checklist_rules'    => [
                    'Approved layout / setting-out drawing verification',
                    'Survey benchmark and reference level verification',
                    'Pile/leg location marking and grid alignment',
                    'Leg spacing and row-to-row distance verification',
                    'Diagonal measurement and alignment inspection',
                    'Photographic evidence – marked leg locations',
                ],
                'expected_images'    => 6,
                'notes'              => 'Setting out & marking individual table leg locations.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => '02 Drilling',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 2,
                'has_before_after'   => true,
                'has_table_tracking' => true,
                'sub_sections'       => ['Normal Soil', 'Weathered Rock'],
                'checklist_rules'    => [
                    'Drilling equipment and method verification',
                    'Drilling location verification against approved layout',
                    'Drilled hole diameter verification',
                    'Drilling depth measurement and recording',
                    'Verticality / bore alignment inspection',
                    'Photographic evidence – drilling process and completed holes',
                ],
                'expected_images'    => 6,
                'notes'              => 'Augering / Rock drilling for pile foundations.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => '03 Casting',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 3,
                'has_before_after'   => true,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'checklist_rules'    => [
                    'Reinforcement / embedded component inspection, if applicable',
                    'Concrete mix design and approval verification',
                    'Concrete delivery and batch details recording',
                    'Concrete slump test and sampling, as applicable',
                    'Concrete pouring and compaction inspection',
                    'Pile / foundation top level verification',
                    'Curing procedure and duration monitoring',
                    'Photographic evidence – before, during and after casting',
                ],
                'expected_images'    => 8,
                'notes'              => 'Concrete casting with vertical GI poles inserted.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => '04 Capping',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 4,
                'has_before_after'   => true,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'checklist_rules'    => [
                    'Pile head level and concrete condition inspection',
                    'Pile trimming / surface preparation verification',
                    'Cap / bracket material and dimensions inspection',
                    'Capping installation and alignment verification',
                    'Bolt tightening / connection inspection',
                    'Final top elevation and level verification',
                    'Photographic evidence – completed capping',
                ],
                'expected_images'    => 7,
                'notes'              => 'Concrete pile top capping and curing protection.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => '05 MMS Super Structure',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 5,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => ['Table-wise', 'Step-wise'],
                'checklist_rules'    => [
                    'Column / post installation and alignment',
                    'Rafter and purlin installation inspection',
                    'Structural member spacing and dimensional verification',
                    'Bolted connection and torque inspection',
                    'Row alignment, tilt angle and structural level verification',
                    'Final structural stability and workmanship inspection',
                    'Photographic evidence – structural assembly',
                ],
                'expected_images'    => 7,
                'notes'              => 'Erection of structural steel framework and purlins.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => '06 Panel Installation',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 6,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'checklist_rules'    => [
                    'PV module model and rating verification',
                    'Module visual inspection for cracks and damage',
                    'Module orientation and positioning verification',
                    'Module spacing and alignment inspection',
                    'Clamping position and torque verification',
                    'Module earthing / bonding inspection',
                    'Final module row alignment inspection',
                    'Photographic evidence – installed PV modules',
                ],
                'expected_images'    => 8,
                'notes'              => 'Mounting PV modules with clamps, earthing, and alignment.',
            ],
            [
                'category'           => 'PV Installation',
                'name'               => '07 DC Cabling',
                'unit'               => 'Tables',
                'target_qty'         => 384,
                'sort_order'         => 7,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'checklist_rules'    => [
                    'DC cable type, size and manufacturer verification',
                    'Cable drum inspection and identification',
                    'Cable routing and laying inspection',
                    'Cable tray / conduit / HDPE installation inspection, as applicable',
                    'Cable dressing, support and securing inspection',
                    'Positive and negative polarity verification',
                    'String identification and labelling inspection',
                    'MC4 connector crimping and connection inspection',
                    'Insulation resistance test recording',
                    'String Voc / polarity verification',
                    'Cable continuity and termination inspection',
                    'Photographic evidence – cable routing, connections and completed installation',
                ],
                'expected_images'    => 12,
                'notes'              => 'DC string cabling, MC4 crimping, polarity and testing.',
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

        // Remove completely legacy milestones from PV Installation as requested
        $obsoletePVNames = [
            'Ground Cleaning',
            'Ground Cleaning and Adjustment',
            'Pile Testing',
            'Total Setting-Out',
        ];
        SectionTemplate::whereIn('name', $obsoletePVNames)->delete();
        SolarSection::whereIn('name', $obsoletePVNames)->delete();

        // Rename legacy names to standard 01-07 sub-categories
        $legacyNameMap = [
            'Pile Marking'                      => '01 Table Leg Marking',
            'Drilling'                          => '02 Drilling',
            'Orgarin'                           => '02 Drilling',
            'Casting'                           => '03 Casting',
            'Capping'                           => '04 Capping',
            'MMS Super Structure'               => '05 MMS Super Structure',
            'Structure - Installation (Tables)' => '05 MMS Super Structure',
            'Panel Installation'                => '06 Panel Installation',
            'PV Module Installation'            => '06 Panel Installation',
            'DC Cabling'                        => '07 DC Cabling',
            'DC Cabling & Terminations'         => '07 DC Cabling',
            'AC Cabling'                        => 'LV Cabling',
            'Smart Transformer'                 => 'Smart Transformer (MV Station) Equipment Installation',
            'Final Termination'                 => 'Final Termination & Testing',
            'LV/MV Panel Board Installation'    => 'Switchyard & Panel Room Civil Works',
            'Underground MV Cabling'            => 'Underground MV Cabling (33kV)',
            'Four Paul Yard'                    => 'CEB Gantry Connection & Switchyard Accessories',
            'Final Investigation'               => 'Testing, Commissioning & PAC',
        ];

        foreach ($legacyNameMap as $oldName => $newName) {
            SolarSection::where('name', $oldName)->update(['name' => $newName]);
            SectionTemplate::where('name', $oldName)->update(['name' => $newName]);
        }

        foreach ($templates as $template) {
            SectionTemplate::updateOrCreate(
                ['name' => $template['name']],
                [
                    'category'           => $template['category'],
                    'unit'               => $template['unit'],
                    'target_qty'         => $template['target_qty'],
                    'sort_order'         => $template['sort_order'],
                    'has_before_after'   => $template['has_before_after'],
                    'has_table_tracking' => $template['has_table_tracking'],
                    'sub_sections'       => $template['sub_sections'],
                    'checklist_rules'    => $template['checklist_rules'] ?? null,
                    'expected_images'    => $template['expected_images'],
                    'notes'              => $template['notes'],
                ]
            );
        }

        // Remove any obsolete templates not in the active definitions
        $validNames = array_column($templates, 'name');
        SectionTemplate::whereNotIn('name', $validNames)->delete();

        // Backfill existing SolarSection records with category, unit, target_qty, sort_order, checklist_rules
        $allTemplates = SectionTemplate::all()->keyBy('name');
        foreach (SolarSection::all() as $section) {
            if ($tmpl = $allTemplates->get($section->name)) {
                $section->update([
                    'category'        => $tmpl->category,
                    'unit'            => $tmpl->unit,
                    'target_qty'      => $section->target_qty ?: $tmpl->target_qty,
                    'sort_order'      => $tmpl->sort_order,
                    'checklist_rules' => $tmpl->checklist_rules,
                ]);
            }
        }

        // Ensure all active projects have all 7 PV Installation sections
        $pvTemplates = SectionTemplate::where('category', 'PV Installation')->orderBy('sort_order')->get();
        foreach (\App\Models\SolarProject::all() as $project) {
            foreach ($pvTemplates as $pvTmpl) {
                SolarSection::firstOrCreate(
                    [
                        'solar_project_id' => $project->id,
                        'name'             => $pvTmpl->name,
                    ],
                    [
                        'category'           => $pvTmpl->category,
                        'unit'               => $pvTmpl->unit,
                        'target_qty'         => $pvTmpl->target_qty,
                        'sort_order'         => $pvTmpl->sort_order,
                        'has_before_after'   => $pvTmpl->has_before_after,
                        'has_table_tracking' => $pvTmpl->has_table_tracking,
                        'sub_sections'       => $pvTmpl->sub_sections,
                        'checklist_rules'    => $pvTmpl->checklist_rules,
                        'expected_images'    => $pvTmpl->expected_images,
                        'notes'              => $pvTmpl->notes,
                    ]
                );
            }
        }

        $this->command->info('Section templates seeded successfully: ' . SectionTemplate::count() . ' BOQ milestones ready with PV Installation hierarchy.');
    }
}
