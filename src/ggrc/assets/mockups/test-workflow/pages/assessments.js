(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.TestWorkflow = GGRC.Bootstrap.Mockups.TestWorkflow || {};

  GGRC.Bootstrap.Mockups.TestWorkflow.Assessments = {
    title: 'Assessments',
    icon: 'assessment',
    template: '/request/widget.mustache',
    children: GGRC.Bootstrap.Mockups.Assessor.Assessments.children
  };
})(GGRC || {}, GGRC.Mockup.Generator);
