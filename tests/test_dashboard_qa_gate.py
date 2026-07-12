from app.api.v1.dashboard import _is_qa_pass, _metric_quality_score, _summarize_records


def test_qa_pass_threshold_boundaries() -> None:
    assert not _is_qa_pass([])
    assert not _is_qa_pass([59, 80, 80, 80])
    assert not _is_qa_pass([60, 79, 80, 100])
    assert _is_qa_pass([60, 80, 80, 100])


def test_low_metric_blocks_high_average() -> None:
    assert not _is_qa_pass([59, 100, 100, 100])


def test_metric_quality_score() -> None:
    # Standard metrics are not modified
    assert _metric_quality_score('task_completion_score', 85.0) == 85.0
    assert _metric_quality_score('intent_understanding_score', 40.0) == 40.0

    # ai_detectability_score is inverted: lower is better quality
    assert _metric_quality_score('ai_detectability_score', 30.0) == 100.0  # < 60 -> 100
    assert _metric_quality_score('ai_detectability_score', 59.0) == 100.0  # < 60 -> 100
    assert _metric_quality_score('ai_detectability_score', 60.0) == 70.0   # <= 70 -> 70
    assert _metric_quality_score('ai_detectability_score', 70.0) == 70.0   # <= 70 -> 70
    assert _metric_quality_score('ai_detectability_score', 80.0) == 20.0   # > 70 -> 100 - 80 = 20
    assert _metric_quality_score('ai_detectability_score', 100.0) == 0.0   # > 70 -> 100 - 100 = 0


def test_dashboard_summary_attention_and_weakest_metric() -> None:
    summary = _summarize_records(
        [
            {
                'is_success': False,
                'evaluated': True,
                'duration_seconds': 30.0,
                'overall_score': 66.56,
                'task_completion_score': 45.0,
                'intent_understanding_score': 72.0,
                'required_info_capture_score': 70.0,
                'ai_detectability_score': 79.0,
                'confidence_by_metric': {},
            },
            {
                'is_success': True,
                'evaluated': True,
                'duration_seconds': 45.0,
                'overall_score': 85.0,
                'task_completion_score': 65.0,
                'intent_understanding_score': 90.0,
                'required_info_capture_score': 90.0,
                'ai_detectability_score': 95.0,
                'confidence_by_metric': {},
            },
            {
                'is_success': False,
                'evaluated': False,
                'duration_seconds': None,
                'overall_score': None,
                'task_completion_score': None,
                'intent_understanding_score': None,
                'required_info_capture_score': None,
                'ai_detectability_score': None,
                'confidence_by_metric': {},
            },
        ]
    )

    assert summary['needs_attention_conversations'] == 1
    assert summary['weakest_metric_key'] == 'task_completion_score'
    assert summary['weakest_metric_label'] == 'Task completion'
