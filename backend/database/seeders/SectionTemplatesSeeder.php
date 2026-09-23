<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SectionTemplate;

class SectionTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name'               => 'Ground Cleaning',
                'sort_order'         => 1,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => 'Approximately 10 images of site clearing progress.',
            ],
            [
                'name'               => 'Pile Testing',
                'sort_order'         => 2,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'Total Setting-Out',
                'sort_order'         => 3,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'Pile Marking',
                'sort_order'         => 4,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 12,
                'notes'              => '12 images per table. Select table number when uploading.',
            ],
            [
                'name'               => 'Orgarin',
                'sort_order'         => 5,
                'has_before_after'   => true,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 12,
                'notes'              => 'Upload before and after images separately. 12 images each.',
            ],
            [
                'name'               => 'Casting',
                'sort_order'         => 6,
                'has_before_after'   => true,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 12,
                'notes'              => 'Upload before and after images separately. 12 images each.',
            ],
            [
                'name'               => 'Capping',
                'sort_order'         => 7,
                'has_before_after'   => true,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 12,
                'notes'              => 'Upload before and after images separately. 12 images each.',
            ],
            [
                'name'               => 'MMS Super Structure',
                'sort_order'         => 8,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => ['Table-wise', 'Step-wise'],
                'expected_images'    => 10,
                'notes'              => 'Select table number and upload type (table-wise or step-wise).',
            ],
            [
                'name'               => 'Panel Installation',
                'sort_order'         => 9,
                'has_before_after'   => false,
                'has_table_tracking' => true,
                'sub_sections'       => null,
                'expected_images'    => 28,
                'notes'              => 'Select table number. Panel count (28 or 14) is configured per project.',
            ],
            [
                'name'               => 'DC Cabling',
                'sort_order'         => 10,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'AC Cabling',
                'sort_order'         => 11,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'Smart Transformer',
                'sort_order'         => 12,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'Final Termination',
                'sort_order'         => 13,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'LV/MV Panel Board Installation',
                'sort_order'         => 14,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'Underground MV Cabling',
                'sort_order'         => 15,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => null,
                'expected_images'    => 10,
                'notes'              => null,
            ],
            [
                'name'               => 'Four Paul Yard',
                'sort_order'         => 16,
                'has_before_after'   => false,
                'has_table_tracking' => false,
                'sub_sections'       => ['Civil Work', 'Accessories Installation', 'Cable Work'],
                'expected_images'    => 10,
                'notes'              => 'Select the relevant sub-section before uploading.',
            ],
        ];

        foreach ($templates as $template) {
            SectionTemplate::firstOrCreate(
                ['name' => $template['name']],
                array_merge($template, [
                    'sub_sections' => $template['sub_sections'] ? json_encode($template['sub_sections']) : null,
                ])
            );
        }

        $this->command->info('Section templates seeded: ' . count($templates) . ' milestones ready.');
    }
}
