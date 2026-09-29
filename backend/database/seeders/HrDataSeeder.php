<?php

namespace Database\Seeders;

use App\Models\HrDepartment;
use App\Models\HrDesignation;
use App\Models\HrEmployee;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class HrDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Departments ────────────────────────────────────────────────────
        $this->command->info('Seeding HR departments...');

        $deptData = [
            ['name' => 'R&D / Engineering',                 'description' => 'Research, development and site engineering operations'],
            ['name' => 'Marketing & Business Development',   'description' => 'Sales, marketing and new business acquisition'],
            ['name' => 'HR & Administration',                'description' => 'Human resources, payroll and office administration'],
            ['name' => 'Finance / Accounts',                 'description' => 'Finance, accounting, budgeting and reporting'],
            ['name' => 'Management / Operations',            'description' => 'Senior management and project operations'],
        ];

        $departments = [];
        foreach ($deptData as $data) {
            $departments[$data['name']] = HrDepartment::firstOrCreate(
                ['name' => $data['name']],
                ['description' => $data['description']]
            );
        }

        // ── 2. Designations ───────────────────────────────────────────────────
        $this->command->info('Seeding HR designations...');

        $designationData = [
            // R&D / Engineering
            ['title' => 'Senior Engineer',          'department' => 'R&D / Engineering',                'level' => 'Senior'],
            ['title' => 'Site Engineer',             'department' => 'R&D / Engineering',                'level' => 'Mid'],
            ['title' => 'Junior Engineer',           'department' => 'R&D / Engineering',                'level' => 'Junior'],
            ['title' => 'Technical Lead',            'department' => 'R&D / Engineering',                'level' => 'Lead'],
            ['title' => 'CAD Designer',              'department' => 'R&D / Engineering',                'level' => 'Mid'],
            // Marketing
            ['title' => 'Marketing Executive',       'department' => 'Marketing & Business Development',  'level' => 'Mid'],
            ['title' => 'Sales Representative',      'department' => 'Marketing & Business Development',  'level' => 'Junior'],
            ['title' => 'Business Dev. Manager',     'department' => 'Marketing & Business Development',  'level' => 'Senior'],
            // HR
            ['title' => 'HR Executive',              'department' => 'HR & Administration',               'level' => 'Mid'],
            ['title' => 'HR Manager',                'department' => 'HR & Administration',               'level' => 'Senior'],
            ['title' => 'Admin Executive',           'department' => 'HR & Administration',               'level' => 'Junior'],
            // Finance
            ['title' => 'Accounts Executive',        'department' => 'Finance / Accounts',               'level' => 'Junior'],
            ['title' => 'Accounts Manager',          'department' => 'Finance / Accounts',               'level' => 'Senior'],
            ['title' => 'Finance Officer',           'department' => 'Finance / Accounts',               'level' => 'Mid'],
            // Management
            ['title' => 'Project Manager',           'department' => 'Management / Operations',           'level' => 'Senior'],
            ['title' => 'Operations Manager',        'department' => 'Management / Operations',           'level' => 'Senior'],
            ['title' => 'Director',                  'department' => 'Management / Operations',           'level' => 'C_Level'],
            ['title' => 'CEO',                       'department' => 'Management / Operations',           'level' => 'C_Level'],
        ];

        $designations = [];
        foreach ($designationData as $data) {
            $dept = $departments[$data['department']];
            $designations[$data['title']] = HrDesignation::firstOrCreate(
                ['title' => $data['title'], 'department_id' => $dept->id],
                ['level' => $data['level']]
            );
        }

        // // ── 3. Employee role ──────────────────────────────────────────────────
        // $employeeRole = Role::firstOrCreate(['name' => 'solar_employee', 'guard_name' => 'web']);

        // // ── 4. Employees (matching frontend mock data) ─────────────────────────
        // $this->command->info('Seeding HR employees...');

        // $employeeData = [
        //     [
        //         'employee_id'  => 'CE-001',
        //         'full_name'    => 'Kasun Perera',
        //         'nic'          => '901234567V',
        //         'dob'          => '1990-05-14',
        //         'gender'       => 'male',
        //         'phone'        => '0771234567',
        //         'personal_email'        => 'kasun.personal@gmail.com',
        //         'company_email'         => 'kasun@circlegroup.lk',
        //         'address'               => '12, Galle Road, Dehiwela, Colombo',
        //         'emergency_contact_name'  => 'Priya Perera',
        //         'emergency_contact_phone' => '0779876543',
        //         'department'   => 'R&D / Engineering',
        //         'designation'  => 'Senior Engineer',
        //         'employment_type' => 'full_time',
        //         'joined_date'  => '2024-01-15',
        //         'probation_end_date' => '2024-07-15',
        //         'work_location'=> 'Site',
        //         'status'       => 'active',
        //         'basic_salary' => 120000,
        //         'password'     => 'Employee@123',
        //     ],
        //     [
        //         'employee_id'  => 'CE-002',
        //         'full_name'    => 'Nimal Silva',
        //         'nic'          => '851234567V',
        //         'dob'          => '1985-08-20',
        //         'gender'       => 'male',
        //         'phone'        => '0772345678',
        //         'personal_email'        => 'nimal.personal@gmail.com',
        //         'company_email'         => 'nimal@circlegroup.lk',
        //         'address'               => '45, Kandy Road, Kelaniya',
        //         'emergency_contact_name'  => 'Kumari Silva',
        //         'emergency_contact_phone' => '0778765432',
        //         'department'   => 'Management / Operations',
        //         'designation'  => 'Project Manager',
        //         'employment_type' => 'full_time',
        //         'joined_date'  => '2024-03-01',
        //         'work_location'=> 'Office',
        //         'status'       => 'active',
        //         'basic_salary' => 150000,
        //         'password'     => 'Employee@123',
        //     ],
        //     [
        //         'employee_id'  => 'CE-003',
        //         'full_name'    => 'Dilani Fernando',
        //         'nic'          => '960234567V',
        //         'dob'          => '1996-03-12',
        //         'gender'       => 'female',
        //         'phone'        => '0773456789',
        //         'personal_email'        => 'dilani.personal@gmail.com',
        //         'company_email'         => 'dilani@circlegroup.lk',
        //         'address'               => '78, High Level Road, Nugegoda',
        //         'emergency_contact_name'  => 'Sunil Fernando',
        //         'emergency_contact_phone' => '0777654321',
        //         'department'   => 'HR & Administration',
        //         'designation'  => 'HR Executive',
        //         'employment_type' => 'full_time',
        //         'joined_date'  => '2024-06-10',
        //         'probation_end_date' => '2024-12-10',
        //         'work_location'=> 'Office',
        //         'status'       => 'probation',
        //         'basic_salary' => 85000,
        //         'password'     => 'Employee@123',
        //     ],
        //     [
        //         'employee_id'  => 'CE-004',
        //         'full_name'    => 'Ruwan Jayasinghe',
        //         'nic'          => '881234567V',
        //         'dob'          => '1988-11-30',
        //         'gender'       => 'male',
        //         'phone'        => '0774567890',
        //         'personal_email'        => 'ruwan.personal@gmail.com',
        //         'company_email'         => 'ruwan@circlegroup.lk',
        //         'address'               => '23, Havelock Road, Colombo 5',
        //         'emergency_contact_name'  => 'Nanda Jayasinghe',
        //         'emergency_contact_phone' => '0776543210',
        //         'department'   => 'Finance / Accounts',
        //         'designation'  => 'Accounts Manager',
        //         'employment_type' => 'full_time',
        //         'joined_date'  => '2023-11-20',
        //         'work_location'=> 'Office',
        //         'status'       => 'active',
        //         'basic_salary' => 130000,
        //         'password'     => 'Employee@123',
        //     ],
        //     [
        //         'employee_id'  => 'CE-005',
        //         'full_name'    => 'Amaya Wickramasinghe',
        //         'nic'          => '980134567V',
        //         'dob'          => '1998-07-05',
        //         'gender'       => 'female',
        //         'phone'        => '0775678901',
        //         'personal_email'        => 'amaya.personal@gmail.com',
        //         'company_email'         => 'amaya@circlegroup.lk',
        //         'address'               => '56, Dutugemunu Street, Dehiwela',
        //         'emergency_contact_name'  => 'Kamal Wickramasinghe',
        //         'emergency_contact_phone' => '0775432109',
        //         'department'   => 'Marketing & Business Development',
        //         'designation'  => 'Marketing Executive',
        //         'employment_type' => 'part_time',
        //         'joined_date'  => '2025-02-01',
        //         'work_location'=> 'Hybrid',
        //         'status'       => 'on_leave',
        //         'basic_salary' => 65000,
        //         'password'     => 'Employee@123',
        //     ],
        // ];

        // foreach ($employeeData as $data) {
        //     // Skip if employee already exists
        //     if (HrEmployee::where('employee_id', $data['employee_id'])->exists()) {
        //         $this->command->line("  Skipping {$data['employee_id']} — already exists.");
        //         continue;
        //     }

        //     $dept = $departments[$data['department']];
        //     $desig = $designations[$data['designation']];

        //     // Create portal user account
        //     $user = User::where('email', $data['company_email'])->first();
        //     if (!$user) {
        //         $user = User::create([
        //             'name'     => $data['full_name'],
        //             'email'    => $data['company_email'],
        //             'password' => Hash::make($data['password']),
        //         ]);
        //         $user->assignRole($employeeRole);
        //     }

        //     HrEmployee::create([
        //         'employee_id'               => $data['employee_id'],
        //         'user_id'                   => $user->id,
        //         'department_id'             => $dept->id,
        //         'designation_id'            => $desig->id,
        //         'full_name'                 => $data['full_name'],
        //         'nic'                       => $data['nic'],
        //         'dob'                       => $data['dob'],
        //         'gender'                    => $data['gender'],
        //         'phone'                     => $data['phone'],
        //         'personal_email'            => $data['personal_email'],
        //         'company_email'             => $data['company_email'],
        //         'address'                   => $data['address'],
        //         'emergency_contact_name'    => $data['emergency_contact_name'],
        //         'emergency_contact_phone'   => $data['emergency_contact_phone'],
        //         'employment_type'           => $data['employment_type'],
        //         'joined_date'               => $data['joined_date'],
        //         'probation_end_date'        => $data['probation_end_date'] ?? null,
        //         'work_location'             => $data['work_location'],
        //         'status'                    => $data['status'],
        //         'basic_salary'              => $data['basic_salary'],
        //     ]);

        //     $this->command->line("  ✓ Created employee {$data['employee_id']} — {$data['full_name']}");
        // }

        // Set manager relationships after all employees created
        // $nimal = HrEmployee::where('employee_id', 'CE-002')->first();
        // HrEmployee::whereIn('employee_id', ['CE-001', 'CE-003', 'CE-004', 'CE-005'])
        //     ->update(['manager_id' => $nimal?->id]);

        // $this->command->info('✅ HR data seeded successfully!');
        // $this->command->line('   Default password for all employees: Employee@123');
    }
}
