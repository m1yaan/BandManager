import { Router } from 'express';
import {
  getBands, getBandDetails, createBand, updateBand, deleteBand, getBandStats
} from '../controllers/bandsController';
import {
  getSingers, createSinger, updateSinger, deleteSinger
} from '../controllers/singersController';
import {
  getSongs, createSong, updateSong, deleteSong
} from '../controllers/songsController';
import {
  getTours, getTourSongs, createTour, updateTour, deleteTour,
  getTourStops, addTourStop, updateTourStop, deleteTourStop,
  getTourFinances, updateTourFinances,
} from '../controllers/toursController';
import {
  getRider, addRiderItem, updateRiderItem, deleteRiderItem
} from '../controllers/riderController';
import {
  songsByBandTours, bandsByComposer, songInfo,
  topBandRepertoire, toursByBand, songsBySinger
} from '../controllers/reportsController';
import {
  getMessages, getHistory, generateMessages,
  acceptMessage, declineMessage, saveMessage,
} from '../controllers/messagesController';
import {
  getNotifications, markRead, markAllRead
} from '../controllers/notificationsController';
import { globalSearch } from '../controllers/searchController';
import { getCalendarEvents, checkConflicts } from '../controllers/calendarController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/bands/stats', getBandStats);

router.get('/bands', getBands);
router.get('/bands/:id/details', getBandDetails);
router.post('/bands', requireRole('manager'), createBand);
router.put('/bands/:id', requireRole('manager'), updateBand);
router.delete('/bands/:id', requireRole('manager'), deleteBand);

router.get('/singers', getSingers);
router.post('/singers', requireRole('manager'), createSinger);
router.put('/singers/:id', requireRole('manager'), updateSinger);
router.delete('/singers/:id', requireRole('manager'), deleteSinger);

router.get('/songs', getSongs);
router.post('/songs', requireRole('manager'), createSong);
router.put('/songs/:id', requireRole('manager'), updateSong);
router.delete('/songs/:id', requireRole('manager'), deleteSong);

router.get('/tours', getTours);
router.get('/tours/:id/songs', getTourSongs);
router.post('/tours', requireRole('manager'), createTour);
router.put('/tours/:id', requireRole('manager'), updateTour);
router.delete('/tours/:id', requireRole('manager'), deleteTour);

router.get('/tours/:id/stops', getTourStops);
router.post('/tours/:id/stops', requireRole('manager'), addTourStop);
router.put('/tours/:id/stops/:stopId', requireRole('manager'), updateTourStop);
router.delete('/tours/:id/stops/:stopId', requireRole('manager'), deleteTourStop);

router.get('/tours/:id/finances', getTourFinances);
router.put('/tours/:id/finances', requireRole('manager'), updateTourFinances);

router.get('/tours/:id/rider', getRider);
router.post('/tours/:id/rider', requireRole('manager'), addRiderItem);
router.put('/rider/:itemId', requireRole('manager'), updateRiderItem);
router.delete('/rider/:itemId', requireRole('manager'), deleteRiderItem);

router.get('/reports/songs-by-band-tours', requireRole('manager'), songsByBandTours);
router.get('/reports/bands-by-composer', requireRole('manager'), bandsByComposer);
router.get('/reports/song-info', requireRole('manager'), songInfo);
router.get('/reports/top-band-repertoire', requireRole('manager'), topBandRepertoire);
router.get('/reports/tours-by-band', requireRole('manager'), toursByBand);
router.get('/reports/songs-by-singer', requireRole('manager'), songsBySinger);

router.get('/messages', requireRole('manager'), getMessages);
router.get('/messages/history', requireRole('manager'), getHistory);
router.post('/messages/generate', requireRole('manager'), generateMessages);
router.post('/messages/:id/accept', requireRole('manager'), acceptMessage);
router.post('/messages/:id/decline', requireRole('manager'), declineMessage);
router.post('/messages/:id/save', requireRole('manager'), saveMessage);

router.get('/notifications', getNotifications);
router.post('/notifications/:id/read', markRead);
router.post('/notifications/read-all', markAllRead);

router.get('/search', globalSearch);

router.get('/calendar', getCalendarEvents);
router.get('/calendar/conflicts', checkConflicts);

export default router;
