<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrAnnouncement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class HrAnnouncementController extends Controller
{
    // ── All users: Active announcements ───────────────────────────────────────
    public function index()
    {
        $today = Carbon::today()->toDateString();
        $announcements = HrAnnouncement::with('creator:id,name')
            ->where(fn($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', $today))
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', $today))
            ->orderByRaw("FIELD(priority, 'urgent', 'important', 'normal')")
            ->orderByDesc('created_at')
            ->get();

        return response()->json($announcements);
    }

    // ── HR Admin: Create announcement ─────────────────────────────────────────
    public function store(Request $request)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'body'         => 'required|string',
            'priority'     => 'in:normal,important,urgent',
            'published_at' => 'nullable|date',
            'expires_at'   => 'nullable|date',
        ]);

        $ann = HrAnnouncement::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Announcement created', 'data' => $ann], 201);
    }

    // ── HR Admin: Delete announcement ─────────────────────────────────────────
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        HrAnnouncement::findOrFail($id)->delete();
        return response()->json(['message' => 'Announcement deleted']);
    }
}
