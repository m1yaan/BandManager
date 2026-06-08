import { Router } from 'express';
import {
  getBands, getBandDetails, createBand, updateBand, deleteBand, getBandStats
} from '../controllers/bandsController';
import {
  getSingers, getSingerBands, getSingerSongs,
  createSinger, updateSinger, deleteSinger
} from '../controllers/singersController';
import {
  getSongs, getSongSingers, getSongBands,
  addSongSinger, removeSongSinger,
  createSong, updateSong, deleteSong
} from '../controllers/songsController';
import {
  getTours, getTourSongs, createTour, updateTour, deleteTour,
  getTourStops, addTourStop, updateTourStop, deleteTourStop,
  getTourFinances, updateTourFinances, getTourRiderStatus,
} from '../controllers/toursController';
import {
  getRider, addRiderItem, updateRiderItem, deleteRiderItem
} from '../controllers/riderController';
import {
  songsByBandTours, bandsByComposer, songInfo,
  topBandRepertoire, toursByBand, songsBySinger
} from '../controllers/reportsController';
import {
  getMessages, getDeferredMessages, getRecentMessages, getUnreadCount,
  getHistory, generateMessages, acceptMessage, declineMessage, deferMessage,
} from '../controllers/messagesController';
import {
  getNotifications, markRead, markAllRead
} from '../controllers/notificationsController';
import { globalSearch }               from '../controllers/searchController';
import { getCalendarEvents, checkConflicts } from '../controllers/calendarController';
import { getFinancials, getRiderAttention } from '../controllers/dashboardController';
import {
  getUsers, getUser, updateUser, blockUser, unblockUser, deleteUser, getAdminStats
} from '../controllers/adminController';
import { getTickets, getTicket, createTicket, updateTicket } from '../controllers/supportController';
import { authMiddleware, requireAdmin, requireManager } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/bands/stats', getBandStats);
router.get('/dashboard/financials', getFinancials);
router.get('/dashboard/rider-attention', getRiderAttention);

// ── Bands ─────────────────────────────────────────────────────────────────────
router.get('/bands',             getBands);
router.get('/bands/:id/details', getBandDetails);
router.post('/bands',            requireManager, createBand);
router.put('/bands/:id',         requireManager, updateBand);
router.delete('/bands/:id',      requireManager, deleteBand);

// ── Singers ───────────────────────────────────────────────────────────────────
router.get('/singers',            getSingers);
router.get('/singers/:id/bands',  getSingerBands);
router.get('/singers/:id/songs',  getSingerSongs);
router.post('/singers',           requireManager, createSinger);
router.put('/singers/:id',        requireManager, updateSinger);
router.delete('/singers/:id',     requireManager, deleteSinger);

// ── Songs ─────────────────────────────────────────────────────────────────────
router.get('/songs',                       getSongs);
router.get('/songs/:id/singers',           getSongSingers);
router.get('/songs/:id/bands',             getSongBands);
router.post('/songs/:id/singers',          requireManager, addSongSinger);
router.delete('/songs/:id/singers/:singerId', requireManager, removeSongSinger);
router.post('/songs',                      requireManager, createSong);
router.put('/songs/:id',                   requireManager, updateSong);
router.delete('/songs/:id',               requireManager, deleteSong);

// ── Tours ─────────────────────────────────────────────────────────────────────
router.get('/tours',              getTours);
router.get('/tours/:id/songs',    getTourSongs);
router.post('/tours',             requireManager, createTour);
router.put('/tours/:id',          requireManager, updateTour);
router.delete('/tours/:id',       requireManager, deleteTour);
router.get('/tours/:id/stops',             getTourStops);
router.post('/tours/:id/stops',            requireManager, addTourStop);
router.put('/tours/:id/stops/:stopId',     requireManager, updateTourStop);
router.delete('/tours/:id/stops/:stopId',  requireManager, deleteTourStop);
router.get('/tours/:id/finances',          getTourFinances);
router.put('/tours/:id/finances',          requireManager, updateTourFinances);
router.get('/tours/:id/rider-status',      getTourRiderStatus);

// ── Rider ─────────────────────────────────────────────────────────────────────
router.get('/tours/:id/rider',    getRider);
router.post('/tours/:id/rider',   requireManager, addRiderItem);
router.put('/rider/:itemId',      requireManager, updateRiderItem);
router.delete('/rider/:itemId',   requireManager, deleteRiderItem);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports/songs-by-band-tours', requireManager, songsByBandTours);
router.get('/reports/bands-by-composer',   requireManager, bandsByComposer);
router.get('/reports/song-info',           requireManager, songInfo);
router.get('/reports/top-band-repertoire', requireManager, topBandRepertoire);
router.get('/reports/tours-by-band',       requireManager, toursByBand);
router.get('/reports/songs-by-singer',     requireManager, songsBySinger);

// ── Messages ──────────────────────────────────────────────────────────────────
router.get('/messages/recent',       requireManager, getRecentMessages);
router.get('/messages/unread-count', requireManager, getUnreadCount);
router.get('/messages/deferred',     requireManager, getDeferredMessages);
router.get('/messages/history',      requireManager, getHistory);
router.get('/messages',              requireManager, getMessages);
router.post('/messages/generate',    requireManager, generateMessages);
router.post('/messages/:id/accept',  requireManager, acceptMessage);
router.post('/messages/:id/decline', requireManager, declineMessage);
router.post('/messages/:id/defer',   requireManager, deferMessage);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications',              getNotifications);
router.post('/notifications/:id/read',    markRead);
router.post('/notifications/read-all',    markAllRead);

// ── Search ────────────────────────────────────────────────────────────────────
router.get('/search', globalSearch);

// ── Calendar ──────────────────────────────────────────────────────────────────
router.get('/calendar',           getCalendarEvents);
router.get('/calendar/conflicts', checkConflicts);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/stats',               requireAdmin, getAdminStats);
router.get('/admin/users',               requireAdmin, getUsers);
router.get('/admin/users/:id',           requireAdmin, getUser);
router.put('/admin/users/:id',           requireAdmin, updateUser);
router.post('/admin/users/:id/block',    requireAdmin, blockUser);
router.post('/admin/users/:id/unblock',  requireAdmin, unblockUser);
router.delete('/admin/users/:id',        requireAdmin, deleteUser);

// ── Support ───────────────────────────────────────────────────────────────────
router.get('/support',       getTickets);
router.get('/support/:id',   getTicket);
router.post('/support',      createTicket);
router.patch('/support/:id', updateTicket);

export default router;
