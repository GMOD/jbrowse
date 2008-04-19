if(!dojo._hasResource["dijit.tests.manualTests"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.tests.manualTests"] = true;
dojo.provide("dijit.tests.manualTests");

try{
if(dojo.isBrowser){
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?");
	doh.registerUrl("dijit/demos/chat.html", dojo.moduleUrl("dijit","demos/chat.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/form.html", dojo.moduleUrl("dijit","demos/form.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/i18n.html", dojo.moduleUrl("dijit","demos/i18n.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/mail.html", dojo.moduleUrl("dijit","demos/mail.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/nihao.html", dojo.moduleUrl("dijit","demos/nihao.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/chat/client.html", dojo.moduleUrl("dijit","demos/chat/client.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/chat/community.html", dojo.moduleUrl("dijit","demos/chat/community.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/chat/operator.html", dojo.moduleUrl("dijit","demos/chat/operator.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/i18n/generate.html", dojo.moduleUrl("dijit","demos/i18n/generate.html"+userArgs), 99999999);
	doh.registerUrl("dijit/demos/i18n/sprite.html", dojo.moduleUrl("dijit","demos/i18n/sprite.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test.html", dojo.moduleUrl("dijit","tests/test.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Calendar.html", dojo.moduleUrl("dijit","tests/test_Calendar.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_ColorPalette.html", dojo.moduleUrl("dijit","tests/test_ColorPalette.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Declaration.html", dojo.moduleUrl("dijit","tests/test_Declaration.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Dialog.html", dojo.moduleUrl("dijit","tests/test_Dialog.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Dialog_focusDestroy.html", dojo.moduleUrl("dijit","tests/test_Dialog_focusDestroy.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Editor.html", dojo.moduleUrl("dijit","tests/test_Editor.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_InlineEditBox.html", dojo.moduleUrl("dijit","tests/test_InlineEditBox.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_instantiate.html", dojo.moduleUrl("dijit","tests/test_instantiate.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Menu.html", dojo.moduleUrl("dijit","tests/test_Menu.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_ProgressBar.html", dojo.moduleUrl("dijit","tests/test_ProgressBar.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_TitlePane.html", dojo.moduleUrl("dijit","tests/test_TitlePane.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_ToolBar.html", dojo.moduleUrl("dijit","tests/test_ToolBar.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Tooltip.html", dojo.moduleUrl("dijit","tests/test_Tooltip.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_TooltipDialog.html", dojo.moduleUrl("dijit","tests/test_TooltipDialog.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Tree.html", dojo.moduleUrl("dijit","tests/test_Tree.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/test_Tree_Notification_API_Support.html", dojo.moduleUrl("dijit","tests/test_Tree_Notification_API_Support.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_programaticTest.html", dojo.moduleUrl("dijit","tests/_programaticTest.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_Button.html", dojo.moduleUrl("dijit","tests/form/test_Button.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_CheckBox.html", dojo.moduleUrl("dijit","tests/form/test_CheckBox.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_ComboBox.html", dojo.moduleUrl("dijit","tests/form/test_ComboBox.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_ComboBox_destroy.html", dojo.moduleUrl("dijit","tests/form/test_ComboBox_destroy.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_DateTextBox.html", dojo.moduleUrl("dijit","tests/form/test_DateTextBox.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_FilteringSelect.html", dojo.moduleUrl("dijit","tests/form/test_FilteringSelect.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_MultiSelect.html", dojo.moduleUrl("dijit","tests/form/test_MultiSelect.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_SimpleTextarea.html", dojo.moduleUrl("dijit","tests/form/test_SimpleTextarea.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_Slider.html", dojo.moduleUrl("dijit","tests/form/test_Slider.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_Spinner.html", dojo.moduleUrl("dijit","tests/form/test_Spinner.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_Textarea.html", dojo.moduleUrl("dijit","tests/form/test_Textarea.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_TimeTextBox.html", dojo.moduleUrl("dijit","tests/form/test_TimeTextBox.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/form/test_validate.html", dojo.moduleUrl("dijit","tests/form/test_validate.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_AccordionContainer.html", dojo.moduleUrl("dijit","tests/layout/test_AccordionContainer.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_BorderContainer.html", dojo.moduleUrl("dijit","tests/layout/test_BorderContainer.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_BorderContainer_complex.html", dojo.moduleUrl("dijit","tests/layout/test_BorderContainer_complex.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_BorderContainer_experimental.html", dojo.moduleUrl("dijit","tests/layout/test_BorderContainer_experimental.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_BorderContainer_full.html", dojo.moduleUrl("dijit","tests/layout/test_BorderContainer_full.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_BorderContainer_nested.html", dojo.moduleUrl("dijit","tests/layout/test_BorderContainer_nested.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_ContentPane.html", dojo.moduleUrl("dijit","tests/layout/test_ContentPane.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_LayoutCode.html", dojo.moduleUrl("dijit","tests/layout/test_LayoutCode.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_LayoutContainer.html", dojo.moduleUrl("dijit","tests/layout/test_LayoutContainer.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_SplitContainer.html", dojo.moduleUrl("dijit","tests/layout/test_SplitContainer.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_StackContainer.html", dojo.moduleUrl("dijit","tests/layout/test_StackContainer.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_StackContainer_code.html", dojo.moduleUrl("dijit","tests/layout/test_StackContainer_code.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_TabContainer.html", dojo.moduleUrl("dijit","tests/layout/test_TabContainer.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_TabContainerTitlePane.html", dojo.moduleUrl("dijit","tests/layout/test_TabContainerTitlePane.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_TabContainer_noLayout.html", dojo.moduleUrl("dijit","tests/layout/test_TabContainer_noLayout.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/layout/test_TabContainer_remote.html", dojo.moduleUrl("dijit","tests/layout/test_TabContainer_remote.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/tree/test_Tree_DnD.html", dojo.moduleUrl("dijit","tests/tree/test_Tree_DnD.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/tree/test_Tree_Programmatic.html", dojo.moduleUrl("dijit","tests/tree/test_Tree_Programmatic.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/tree/test_Tree_v1.html", dojo.moduleUrl("dijit","tests/tree/test_Tree_v1.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_base/test_FocusManager.html", dojo.moduleUrl("dijit","tests/_base/test_FocusManager.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_base/test_focusWidget.html", dojo.moduleUrl("dijit","tests/_base/test_focusWidget.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_base/test_placeStrict.html", dojo.moduleUrl("dijit","tests/_base/test_placeStrict.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_base/test_typematic.html", dojo.moduleUrl("dijit","tests/_base/test_typematic.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_editor/test_CustomPlugin.html", dojo.moduleUrl("dijit","tests/_editor/test_CustomPlugin.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_editor/test_RichText.html", dojo.moduleUrl("dijit","tests/_editor/test_RichText.html"+userArgs), 99999999);
	doh.registerUrl("dijit/tests/_editor/test_ToggleDir.html", dojo.moduleUrl("dijit","tests/_editor/test_ToggleDir.html"+userArgs), 99999999);
	doh.registerUrl("dijit/themes/templateThemeTest.html", dojo.moduleUrl("dijit","themes/templateThemeTest.html"+userArgs), 99999999);
	doh.registerUrl("dijit/themes/themeTester.html", dojo.moduleUrl("dijit","themes/themeTester.html"+userArgs), 99999999);
	if(dojo.isIE){
		doh.registerUrl("dijit/themes/themeTesterQuirk.html", dojo.moduleUrl("dijit","themes/themeTesterQuirk.html"+userArgs), 99999999);
	}
}
}catch(e){
	doh.debug(e);
}

}
