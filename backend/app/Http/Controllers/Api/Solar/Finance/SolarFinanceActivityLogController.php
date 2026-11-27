<?php

namespace App\Http\Controllers\Api\Solar\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;
use App\Services\SolarFinanceActivityService;
use Carbon\Carbon;

class SolarFinanceActivityLogController extends Controller
{
    /**
     * Retrieve paginated Solar Finance activity logs with filters and summary stats.
     */
    public function index(Request $request)
    {
        $query = Activity::with(['causer:id,name,email'])
            ->where('log_name', 'solar_finance');

        // Search query
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('event', 'like', "%{$search}%")
                  ->orWhere('properties', 'like', "%{$search}%");
            });
        }

        // Event filter
        if ($request->filled('event') && $request->event !== 'all') {
            $query->where('event', $request->event);
        }

        // User filter
        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('causer_id', $request->user_id);
        }

        // Date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Summary Stats across all solar_finance logs
        $baseQuery = Activity::where('log_name', 'solar_finance');
        $totalActivities = (clone $baseQuery)->count();
        $todayActivities = (clone $baseQuery)->whereDate('created_at', Carbon::today())->count();
        $approvalsCount  = (clone $baseQuery)->whereIn('event', ['cash_request_approved', 'cash_request_rejected', 'cash_disbursed'])->count();
        $vouchersCount   = (clone $baseQuery)->whereIn('event', ['voucher_created', 'voucher_printed', 'voucher_verified'])->count();
        $roleEventsCount = (clone $baseQuery)->whereIn('event', ['role_updated', 'token_issued'])->count();

        // Paginate results
        $perPage = min((int) ($request->per_page ?? 25), 100);
        $logs = $query->latest()->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'total' => $logs->total(),
            'stats' => [
                'total_activities' => $totalActivities,
                'today_activities' => $todayActivities,
                'approvals_count'  => $approvalsCount,
                'vouchers_count'   => $vouchersCount,
                'role_events_count'=> $roleEventsCount,
            ]
        ]);
    }

    /**
     * Store a client-side triggered activity log (e.g. voucher print/export).
     */
    public function store(Request $request)
    {
        $request->validate([
            'event'       => 'required|string|max:50',
            'description' => 'required|string|max:255',
            'properties'  => 'nullable|array',
        ]);

        $log = SolarFinanceActivityService::log(
            $request->event,
            $request->description,
            null,
            $request->properties ?? []
        );

        return response()->json([
            'message' => 'Activity recorded successfully',
            'log'     => $log
        ]);
    }
}
