from datetime import date
from unittest import mock

from django.test import SimpleTestCase

from . import search_console


class SearchReportingTests(SimpleTestCase):
    def test_page_stats_uses_exactly_28_inclusive_days(self):
        session = mock.Mock()
        session.post.return_value.json.return_value = {'rows': []}
        search_console.page_stats(session, days=28)
        body = session.post.call_args.kwargs['json']
        self.assertEqual((date.fromisoformat(body['endDate']) - date.fromisoformat(body['startDate'])).days, 27)

    def test_previous_period_has_the_same_length_without_overlap(self):
        windows = search_console.report_windows(date(2026, 11, 28))
        current, previous = windows['28d'], windows['previous_28d']
        self.assertEqual(current, (date(2026, 10, 30), date(2026, 11, 26)))
        self.assertEqual(previous, (date(2026, 10, 2), date(2026, 10, 29)))
        self.assertEqual(windows['year_ago_28d'], (date(2025, 10, 30), date(2025, 11, 26)))

    def test_paginated_queries_preserve_requested_dimensions(self):
        session = mock.Mock()
        first, second = mock.Mock(), mock.Mock()
        first.json.return_value = {'rows': [{'keys': ['q', '/a']}, {'keys': ['r', '/b']}]}
        second.json.return_value = {'rows': [{'keys': ['s', '/c']}]}
        session.post.side_effect = [first, second]
        result = search_console.query_rows(session, date(2026, 11, 1), date(2026, 11, 7), ['query', 'page'], row_limit=2)
        self.assertEqual(len(result['rows']), 3)
        self.assertFalse(result['truncated'])
        self.assertEqual([call.kwargs['json']['startRow'] for call in session.post.call_args_list], [0, 2])
        self.assertEqual(session.post.call_args.kwargs['json']['dimensions'], ['query', 'page'])

    def test_limit_exhaustion_is_explicit_not_silent(self):
        session = mock.Mock()
        session.post.return_value.json.return_value = {'rows': [{'keys': ['q']}]}
        result = search_console.query_rows(session, date(2026, 11, 1), date(2026, 11, 7), ['query'], row_limit=1, max_pages=1)
        self.assertTrue(result['truncated'])

    def test_invalid_ranges_and_limits_make_no_request(self):
        session = mock.Mock()
        for kwargs in [{'row_limit': 25001}, {'max_pages': 0}, {'data_state': 'unknown'}]:
            with self.assertRaises(ValueError):
                search_console.query_rows(session, date(2026, 11, 1), date(2026, 11, 7), ['query'], **kwargs)
        with self.assertRaises(ValueError):
            search_console.query_rows(session, date(2026, 11, 7), date(2026, 11, 1), ['query'])
        session.post.assert_not_called()
