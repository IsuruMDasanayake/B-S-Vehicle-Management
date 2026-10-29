<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrEmployee;
use App\Models\HrTrainingLesson;
use App\Models\HrTrainingProgress;
use App\Models\HrTrainingTarget;
use App\Models\User;
use App\Notifications\HrNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class HrTrainingController extends Controller
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static function isHrOrSuperAdmin(?User $user): bool
    {
        if (!$user) return false;
        return $user->role === 'super_admin'
            || $user->role === 'solar_hr_admin'
            || (method_exists($user, 'hasRole') && ($user->hasRole('super_admin') || $user->hasRole('solar_hr_admin')));
    }

    private function resolveEmployee(Request $request): ?HrEmployee
    {
        $user = $request->user();
        if (!$user) return null;

        $employee = HrEmployee::where('user_id', $user->id)->first();
        if (!$employee && !empty($user->email)) {
            $employee = HrEmployee::where('company_email', $user->email)
                ->orWhere('personal_email', $user->email)
                ->first();
        }
        return $employee;
    }

    private function userForEmployee(?HrEmployee $emp): ?User
    {
        if (!$emp) return null;
        if ($emp->user_id) {
            return User::find($emp->user_id);
        }
        $emails = array_filter([$emp->company_email, $emp->personal_email]);
        return !empty($emails) ? User::whereIn('email', $emails)->first() : null;
    }

    private function notifyUser(?User $user, string $title, string $message, string $link, $sourceId, string $severity = 'info'): void
    {
        if (!$user) return;
        try {
            $user->notify(new HrNotification([
                'division'  => 'hr',
                'category'  => 'training',
                'title'     => $title,
                'message'   => $message,
                'severity'  => $severity,
                'link'      => $link,
                'source_id' => $sourceId,
            ]));
        } catch (\Throwable $e) {
            Log::error('Training notification error: ' . $e->getMessage());
        }
    }

    /**
     * Resolve all active HrEmployee models targeted by a given lesson.
     */
    private function getTargetedEmployees(HrTrainingLesson $lesson): Collection
    {
        $query = HrEmployee::with(['department:id,name', 'designation:id,title'])
            ->where('status', 'active');

        if ($lesson->target_type === 'all') {
            return $query->orderBy('full_name')->get();
        }

        $targets = $lesson->targets()->get();
        if ($targets->isEmpty()) {
            return collect();
        }

        $deptIds = $targets->pluck('department_id')->filter()->unique()->values()->all();
        $desigIds = $targets->pluck('designation_id')->filter()->unique()->values()->all();
        $empIds = $targets->pluck('employee_id')->filter()->unique()->values()->all();

        $query->where(function ($q) use ($deptIds, $desigIds, $empIds) {
            if (!empty($deptIds)) {
                $q->orWhereIn('department_id', $deptIds);
            }
            if (!empty($desigIds)) {
                $q->orWhereIn('designation_id', $desigIds);
            }
            if (!empty($empIds)) {
                $q->orWhereIn('id', $empIds);
            }
        });

        return $query->orderBy('full_name')->get();
    }

    /**
     * Check whether a specific employee is assigned to a lesson.
     */
    private function isEmployeeTargeted(HrTrainingLesson $lesson, HrEmployee $employee): bool
    {
        if ($lesson->target_type === 'all') {
            return true;
        }

        return $lesson->targets()
            ->where(function ($q) use ($employee) {
                $q->where('employee_id', $employee->id);
                if ($employee->department_id) {
                    $q->orWhere('department_id', $employee->department_id);
                }
                if ($employee->designation_id) {
                    $q->orWhere('designation_id', $employee->designation_id);
                }
            })
            ->exists();
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  HR Admin Endpoints
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/hr/training/lessons
     */
    public function index(Request $request)
    {
        if (!self::isHrOrSuperAdmin($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lessons = HrTrainingLesson::with(['creator:id,name', 'targets.department:id,name', 'targets.designation:id,title', 'targets.employee:id,full_name'])
            ->latest()
            ->get();

        $activeEmployeeCount = HrEmployee::where('status', 'active')->count();

        $formatted = $lessons->map(function (HrTrainingLesson $lesson) use ($activeEmployeeCount) {
            $targetedEmployees = $this->getTargetedEmployees($lesson);
            $targetedIds = $targetedEmployees->pluck('id');
            $totalAssigned = $targetedIds->count();

            $progressRecords = HrTrainingProgress::where('lesson_id', $lesson->id)
                ->whereIn('employee_id', $targetedIds)
                ->get();

            $completedCount = $progressRecords->where('status', 'completed')->count();
            $inProgressCount = $progressRecords->where('status', 'in_progress')->count();
            $notStartedCount = max(0, $totalAssigned - $completedCount - $inProgressCount);

            $completionRate = $totalAssigned > 0
                ? round(($completedCount / $totalAssigned) * 100, 1)
                : 0;

            return array_merge($lesson->toArray(), [
                'stats' => [
                    'total_assigned'    => $totalAssigned,
                    'completed_count'   => $completedCount,
                    'in_progress_count' => $inProgressCount,
                    'not_started_count' => $notStartedCount,
                    'completion_rate'   => $completionRate,
                ],
            ]);
        });

        // Summary metrics
        $totalLessons = $formatted->count();
        $totalCompletions = $formatted->sum(fn($l) => $l['stats']['completed_count']);
        $totalAssignments = $formatted->sum(fn($l) => $l['stats']['total_assigned']);
        $overallRate = $totalAssignments > 0 ? round(($totalCompletions / $totalAssignments) * 100, 1) : 0;
        $inProgressTotal = $formatted->sum(fn($l) => $l['stats']['in_progress_count']);
        $pendingTotal = $formatted->sum(fn($l) => $l['stats']['not_started_count']);

        return response()->json([
            'summary' => [
                'total_lessons'       => $totalLessons,
                'overall_rate'        => $overallRate,
                'total_completions'   => $totalCompletions,
                'in_progress_learners'=> $inProgressTotal,
                'pending_learners'    => $pendingTotal,
                'active_employees'    => $activeEmployeeCount,
            ],
            'lessons' => $formatted,
        ]);
    }

    /**
     * POST /api/hr/training/lessons
     */
    public function store(Request $request)
    {
        if (!self::isHrOrSuperAdmin($request->user())) {
            return response()->json(['message' => 'Only HR Admin or Super Admin can upload training lessons.'], 403);
        }

        $validated = $request->validate([
            'title'                => 'required|string|max:255',
            'description'          => 'nullable|string|max:5000',
            'category'             => 'nullable|string|max:100',
            'video'                => 'required|file|mimes:mp4,webm,mov,ogg|max:512000', // up to 500MB
            'duration_seconds'     => 'nullable|integer|min:0',
            'min_watch_percentage' => 'nullable|integer|min:50|max:100',
            'is_mandatory'         => 'nullable|boolean',
            'due_date'             => 'nullable|date',
            'target_type'          => 'required|in:all,department,designation,custom',
            'department_ids'       => 'nullable|array',
            'department_ids.*'     => 'integer|exists:hr_departments,id',
            'designation_ids'      => 'nullable|array',
            'designation_ids.*'    => 'integer|exists:hr_designations,id',
            'employee_ids'         => 'nullable|array',
            'employee_ids.*'       => 'integer|exists:hr_employees,id',
        ]);

        $file = $request->file('video');
        $originalName = $file->getClientOriginalName();
        $fileSize = $file->getSize();
        $path = $file->store('hr/training_videos', 'public');

        $lesson = DB::transaction(function () use ($request, $validated, $path, $originalName, $fileSize) {
            $lesson = HrTrainingLesson::create([
                'title'                => $validated['title'],
                'description'          => $validated['description'] ?? null,
                'category'             => $validated['category'] ?? 'General',
                'video_path'           => $path,
                'video_filename'       => $originalName,
                'file_size_bytes'      => $fileSize,
                'duration_seconds'     => (int) ($validated['duration_seconds'] ?? 0),
                'min_watch_percentage' => (int) ($validated['min_watch_percentage'] ?? 90),
                'is_mandatory'         => filter_var($request->input('is_mandatory', true), FILTER_VALIDATE_BOOLEAN),
                'due_date'             => $validated['due_date'] ?? null,
                'target_type'          => $validated['target_type'],
                'status'               => 'published',
                'created_by'           => $request->user()->id,
            ]);

            if ($validated['target_type'] === 'department' && !empty($validated['department_ids'])) {
                foreach ($validated['department_ids'] as $deptId) {
                    HrTrainingTarget::create([
                        'lesson_id'     => $lesson->id,
                        'department_id' => $deptId,
                    ]);
                }
            } elseif ($validated['target_type'] === 'designation' && !empty($validated['designation_ids'])) {
                foreach ($validated['designation_ids'] as $desigId) {
                    HrTrainingTarget::create([
                        'lesson_id'      => $lesson->id,
                        'designation_id' => $desigId,
                    ]);
                }
            } elseif ($validated['target_type'] === 'custom' && !empty($validated['employee_ids'])) {
                foreach ($validated['employee_ids'] as $empId) {
                    HrTrainingTarget::create([
                        'lesson_id'   => $lesson->id,
                        'employee_id' => $empId,
                    ]);
                }
            }

            return $lesson;
        });

        // Resolve targeted employees, initialize progress records, and send notifications
        $targetedEmployees = $this->getTargetedEmployees($lesson);
        $dueText = $lesson->due_date ? ' (Due by ' . Carbon::parse($lesson->due_date)->format('d M Y') . ')' : '';

        foreach ($targetedEmployees as $emp) {
            HrTrainingProgress::firstOrCreate(
                ['lesson_id' => $lesson->id, 'employee_id' => $emp->id],
                ['status' => 'not_started']
            );

            $empUser = $this->userForEmployee($emp);
            $this->notifyUser(
                $empUser,
                "🎓 New Training Video: {$lesson->title}",
                "HR has uploaded a new training lesson \"{$lesson->title}\"{$dueText}. Please watch and confirm completion in your portal.",
                "/solar/hr/portal/training",
                "training-lesson-{$lesson->id}",
                $lesson->is_mandatory ? 'warning' : 'info'
            );
        }

        return response()->json([
            'message' => "Training lesson uploaded and {$targetedEmployees->count()} employees notified.",
            'lesson'  => $lesson->load('targets'),
        ], 201);
    }

    /**
     * GET /api/hr/training/lessons/{id}
     */
    public function show(Request $request, $id)
    {
        if (!self::isHrOrSuperAdmin($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lesson = HrTrainingLesson::with([
            'creator:id,name',
            'targets.department:id,name',
            'targets.designation:id,title',
            'targets.employee:id,full_name,employee_id,epf_no',
        ])->findOrFail($id);

        $targetedEmployees = $this->getTargetedEmployees($lesson);
        $progressMap = HrTrainingProgress::where('lesson_id', $lesson->id)
            ->get()
            ->keyBy('employee_id');

        $roster = $targetedEmployees->map(function (HrEmployee $emp) use ($progressMap, $lesson) {
            $prog = $progressMap->get($emp->id);
            $secondsWatched = $prog ? (int) $prog->seconds_watched : 0;
            $watchPct = $prog ? (float) $prog->watch_percentage : 0.0;
            $status = $prog ? $prog->status : 'not_started';

            return [
                'employee' => [
                    'id'          => $emp->id,
                    'full_name'   => $emp->full_name,
                    'employee_id' => $emp->employee_id,
                    'epf_no'      => $emp->epf_no,
                    'department'  => $emp->department?->name,
                    'designation' => $emp->designation?->title,
                    'photo_url'   => $emp->photo_url,
                ],
                'progress' => [
                    'id'                     => $prog?->id,
                    'status'                 => $status,
                    'seconds_watched'        => $secondsWatched,
                    'formatted_watch_time'   => $this->formatSeconds($secondsWatched),
                    'max_position_seconds'   => $prog ? (int) $prog->max_position_seconds : 0,
                    'last_position_seconds'  => $prog ? (int) $prog->last_position_seconds : 0,
                    'watch_percentage'       => round($watchPct, 1),
                    'started_at'             => $prog?->started_at,
                    'completed_at'           => $prog?->completed_at,
                    'acknowledged_at'        => $prog?->acknowledged_at,
                    'employee_reply'         => $prog?->employee_reply,
                    'employee_notes'         => $prog?->employee_notes,
                    'updated_at'             => $prog?->updated_at,
                ],
            ];
        })->values();

        $completedCount = $roster->where('progress.status', 'completed')->count();
        $inProgressCount = $roster->where('progress.status', 'in_progress')->count();
        $notStartedCount = $roster->where('progress.status', 'not_started')->count();
        $totalAssigned = $roster->count();

        return response()->json([
            'lesson' => $lesson,
            'stats'  => [
                'total_assigned'    => $totalAssigned,
                'completed_count'   => $completedCount,
                'in_progress_count' => $inProgressCount,
                'not_started_count' => $notStartedCount,
                'completion_rate'   => $totalAssigned > 0 ? round(($completedCount / $totalAssigned) * 100, 1) : 0,
            ],
            'roster' => $roster,
        ]);
    }

    /**
     * PUT /api/hr/training/lessons/{id}
     */
    public function update(Request $request, $id)
    {
        if (!self::isHrOrSuperAdmin($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lesson = HrTrainingLesson::findOrFail($id);

        $validated = $request->validate([
            'title'                => 'sometimes|required|string|max:255',
            'description'          => 'nullable|string|max:5000',
            'category'             => 'nullable|string|max:100',
            'min_watch_percentage' => 'nullable|integer|min:50|max:100',
            'is_mandatory'         => 'nullable|boolean',
            'due_date'             => 'nullable|date',
            'status'               => 'nullable|in:draft,published,archived',
        ]);

        $lesson->update($validated);

        return response()->json([
            'message' => 'Lesson updated successfully.',
            'lesson'  => $lesson->fresh(),
        ]);
    }

    /**
     * DELETE /api/hr/training/lessons/{id}
     */
    public function destroy(Request $request, $id)
    {
        if (!self::isHrOrSuperAdmin($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lesson = HrTrainingLesson::findOrFail($id);

        if ($lesson->video_path && Storage::disk('public')->exists($lesson->video_path)) {
            Storage::disk('public')->delete($lesson->video_path);
        }

        $lesson->forceDelete();

        return response()->json(['message' => 'Training lesson deleted.']);
    }

    /**
     * POST /api/hr/training/lessons/{id}/remind
     */
    public function remind(Request $request, $id)
    {
        if (!self::isHrOrSuperAdmin($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lesson = HrTrainingLesson::findOrFail($id);
        $targetedEmployees = $this->getTargetedEmployees($lesson);

        $completedEmpIds = HrTrainingProgress::where('lesson_id', $lesson->id)
            ->where('status', 'completed')
            ->pluck('employee_id')
            ->all();

        $pendingEmployees = $targetedEmployees->reject(fn($emp) => in_array($emp->id, $completedEmpIds));

        $sentCount = 0;
        foreach ($pendingEmployees as $emp) {
            $user = $this->userForEmployee($emp);
            if ($user) {
                $this->notifyUser(
                    $user,
                    "⏰ Reminder: Complete Training \"{$lesson->title}\"",
                    "HR Reminder: You have not yet completed the training lesson \"{$lesson->title}\". Please watch it and submit your confirmation.",
                    "/solar/hr/portal/training",
                    "training-remind-{$lesson->id}-" . time(),
                    'warning'
                );
                $sentCount++;
            }
        }

        return response()->json([
            'message'    => "Reminder notifications sent to {$sentCount} pending employee(s).",
            'sent_count' => $sentCount,
        ]);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Employee Portal Endpoints
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/hr/portal/training
     */
    public function myLessons(Request $request)
    {
        $employee = $this->resolveEmployee($request);
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found'], 404);
        }

        $publishedLessons = HrTrainingLesson::with('targets')
            ->where('status', 'published')
            ->latest()
            ->get()
            ->filter(fn(HrTrainingLesson $lesson) => $this->isEmployeeTargeted($lesson, $employee))
            ->values();

        $progressMap = HrTrainingProgress::where('employee_id', $employee->id)
            ->whereIn('lesson_id', $publishedLessons->pluck('id'))
            ->get()
            ->keyBy('lesson_id');

        $items = $publishedLessons->map(function (HrTrainingLesson $lesson) use ($progressMap) {
            $prog = $progressMap->get($lesson->id);
            $secondsWatched = $prog ? (int) $prog->seconds_watched : 0;
            $watchPct = $prog ? (float) $prog->watch_percentage : 0.0;
            $status = $prog ? $prog->status : 'not_started';

            return [
                'id'                   => $lesson->id,
                'title'                => $lesson->title,
                'description'          => $lesson->description,
                'category'             => $lesson->category,
                'video_url'            => $lesson->video_url,
                'duration_seconds'     => (int) $lesson->duration_seconds,
                'formatted_duration'   => $lesson->formatted_duration,
                'formatted_size'       => $lesson->formatted_size,
                'min_watch_percentage' => (int) $lesson->min_watch_percentage,
                'is_mandatory'         => (bool) $lesson->is_mandatory,
                'due_date'             => $lesson->due_date?->format('Y-m-d'),
                'created_at'           => $lesson->created_at,
                'progress'             => [
                    'status'                => $status,
                    'seconds_watched'       => $secondsWatched,
                    'formatted_watch_time'  => $this->formatSeconds($secondsWatched),
                    'max_position_seconds'  => $prog ? (int) $prog->max_position_seconds : 0,
                    'last_position_seconds' => $prog ? (int) $prog->last_position_seconds : 0,
                    'watch_percentage'      => round($watchPct, 1),
                    'started_at'            => $prog?->started_at,
                    'completed_at'          => $prog?->completed_at,
                    'acknowledged_at'       => $prog?->acknowledged_at,
                    'employee_reply'        => $prog?->employee_reply,
                    'employee_notes'        => $prog?->employee_notes,
                ],
            ];
        });

        $completedCount = $items->where('progress.status', 'completed')->count();
        $pendingCount = $items->count() - $completedCount;

        return response()->json([
            'summary' => [
                'total_assigned'  => $items->count(),
                'pending_count'   => $pendingCount,
                'completed_count' => $completedCount,
            ],
            'lessons' => $items,
        ]);
    }

    /**
     * POST /api/hr/portal/training/{id}/progress
     * Heartbeat ping called every ~5 seconds while the video is actively playing.
     */
    public function recordProgress(Request $request, $id)
    {
        $employee = $this->resolveEmployee($request);
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found'], 404);
        }

        $lesson = HrTrainingLesson::findOrFail($id);
        if (!$this->isEmployeeTargeted($lesson, $employee)) {
            return response()->json(['message' => 'This lesson is not assigned to you.'], 403);
        }

        $validated = $request->validate([
            'current_time'      => 'required|numeric|min:0',
            'duration'          => 'nullable|numeric|min:0',
            'seconds_increment' => 'required|numeric|min:0',
        ]);

        $currentTime = (int) floor($validated['current_time']);
        $reportedDuration = (int) floor($validated['duration'] ?? 0);
        $increment = max(0, (int) round($validated['seconds_increment']));

        // If lesson duration was not recorded at upload time, save it from player metadata
        if ($lesson->duration_seconds <= 0 && $reportedDuration > 0) {
            $lesson->update(['duration_seconds' => $reportedDuration]);
        }

        $totalDuration = max(1, $lesson->duration_seconds > 0 ? $lesson->duration_seconds : $reportedDuration);

        $progress = HrTrainingProgress::firstOrNew([
            'lesson_id'   => $lesson->id,
            'employee_id' => $employee->id,
        ]);

        if (!$progress->exists) {
            $progress->seconds_watched = 0;
            $progress->max_position_seconds = 0;
            $progress->last_position_seconds = 0;
            $progress->watch_percentage = 0;
            $progress->status = 'in_progress';
            $progress->started_at = Carbon::now();
        } elseif ($progress->status === 'not_started') {
            $progress->status = 'in_progress';
            $progress->started_at = $progress->started_at ?? Carbon::now();
        }

        // Accumulate real watched seconds (capped at total video duration)
        $newSecondsWatched = min($totalDuration, max($progress->seconds_watched + $increment, $currentTime));
        $progress->seconds_watched = $newSecondsWatched;

        // Update max_position_seconds and last_position_seconds
        $progress->max_position_seconds = max($progress->max_position_seconds, min($totalDuration, $currentTime));
        $progress->last_position_seconds = min($progress->max_position_seconds, $currentTime);

        // Calculate watch percentage
        $effectiveWatched = max($progress->seconds_watched, $progress->max_position_seconds);
        $pct = min(100.0, round(($effectiveWatched / $totalDuration) * 100, 1));
        // Never decrease watch percentage once earned
        $progress->watch_percentage = max((float) $progress->watch_percentage, $pct);

        $progress->save();

        return response()->json([
            'progress' => [
                'status'                => $progress->status,
                'seconds_watched'       => (int) $progress->seconds_watched,
                'formatted_watch_time'  => $this->formatSeconds((int) $progress->seconds_watched),
                'max_position_seconds'  => (int) $progress->max_position_seconds,
                'last_position_seconds' => (int) $progress->last_position_seconds,
                'watch_percentage'      => round((float) $progress->watch_percentage, 1),
                'can_complete'          => $progress->watch_percentage >= max(50, $lesson->min_watch_percentage - 2),
            ],
        ]);
    }

    /**
     * POST /api/hr/portal/training/{id}/complete
     * Employee submits "I have watched and understood this lesson" confirmation.
     */
    public function completeLesson(Request $request, $id)
    {
        $employee = $this->resolveEmployee($request);
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found'], 404);
        }

        $lesson = HrTrainingLesson::findOrFail($id);
        if (!$this->isEmployeeTargeted($lesson, $employee)) {
            return response()->json(['message' => 'This lesson is not assigned to you.'], 403);
        }

        $validated = $request->validate([
            'acknowledged'   => 'required|accepted',
            'employee_notes' => 'nullable|string|max:2000',
        ]);

        $progress = HrTrainingProgress::where('lesson_id', $lesson->id)
            ->where('employee_id', $employee->id)
            ->first();

        $requiredPct = max(50, $lesson->min_watch_percentage - 2);
        if (!$progress || $progress->watch_percentage < $requiredPct) {
            return response()->json([
                'message' => "Please watch at least {$lesson->min_watch_percentage}% of the video before marking it as completed.",
            ], 422);
        }

        $progress->update([
            'status'          => 'completed',
            'watch_percentage'=> 100.0,
            'seconds_watched' => max($progress->seconds_watched, $lesson->duration_seconds),
            'completed_at'    => $progress->completed_at ?? Carbon::now(),
            'acknowledged_at' => Carbon::now(),
            'employee_reply'  => 'I have watched and understood this lesson.',
            'employee_notes'  => $validated['employee_notes'] ?? $progress->employee_notes,
        ]);

        return response()->json([
            'message'  => 'Training lesson completed and acknowledged!',
            'progress' => [
                'status'                => $progress->status,
                'seconds_watched'       => (int) $progress->seconds_watched,
                'formatted_watch_time'  => $this->formatSeconds((int) $progress->seconds_watched),
                'max_position_seconds'  => (int) $progress->max_position_seconds,
                'last_position_seconds' => (int) $progress->last_position_seconds,
                'watch_percentage'      => 100.0,
                'completed_at'          => $progress->completed_at,
                'acknowledged_at'       => $progress->acknowledged_at,
                'employee_reply'        => $progress->employee_reply,
                'employee_notes'        => $progress->employee_notes,
            ],
        ]);
    }

    private function formatSeconds(int $secs): string
    {
        if ($secs <= 0) return '0m 00s';
        $mins = intdiv($secs, 60);
        $rem = $secs % 60;
        if ($mins >= 60) {
            $hrs = intdiv($mins, 60);
            $mins = $mins % 60;
            return sprintf('%dh %02dm %02ds', $hrs, $mins, $rem);
        }
        return sprintf('%dm %02ds', $mins, $rem);
    }
}

